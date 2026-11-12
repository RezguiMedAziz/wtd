import { storageService } from './storageService';
import { stickerService } from './stickerService';
import { apiClient } from './api/apiClient';

const DRAFT = 'draft';
const GUEST = 'guestDesigns'; // designs saved before the user has an account
const ID_MAP = 'guestIdMap'; // local id -> backend id, once synced

// ---- cart notifications ---------------------------------------------------------------------
// The cart listens to these (see CartContext), so saving a design puts it in the cart without
// any component having to call the cart itself.
export const DESIGN_SAVED = 'wtd:design-saved';
export const DESIGN_GONE = 'wtd:design-gone';
const emit = (name, detail) => {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    /* ignore */
  }
};
export const emitDesignSaved = (d) => d?.id && emit(DESIGN_SAVED, { id: d.id, name: d.name });
export const emitDesignGone = (...ids) => {
  const list = [...new Set(ids.flat().filter(Boolean))];
  if (list.length) emit(DESIGN_GONE, { ids: list });
};

/** Payload the backend expects for a design. Sticker images are referenced by id only (the server resolves them). */
export const toPayload = (d, name) => ({
  name: (name || '').trim() || `${d.phone.name} design`,
  phoneId: d.phone.id,
  caseType: d.caseType,
  color: d.caseType === 'silicone' ? d.color : null,
  sessionId: d.sessionId,
  sheetId: d.sheet?.id || null,
  stickers: d.stickers.map(({ uid, kind, refId, x, y, w, rot, ar, fill }) => ({ uid, kind, refId, x, y, w, rot, ar, fill: !!fill })),
  uploadIds: d.uploads.map((u) => u.id),
});

/** Turns a saved design (guest record or backend DesignOut) back into the payload the backend expects. */
export const savedToPayload = (s) =>
  s.payload || {
    name: s.name,
    phoneId: s.phone.id,
    caseType: s.caseType,
    color: s.caseType === 'silicone' ? s.color : null,
    sessionId: s.sessionId || '',
    sheetId: s.sheetId || s.sheet?.id || null,
    stickers: (s.stickers || []).map(({ uid, kind, refId, x, y, w, rot, ar, fill }) => ({ uid, kind, refId, x, y, w, rot, ar, fill: !!fill })),
    uploadIds: (s.uploads || []).map((u) => u.id),
  };

// Local draft = the in-progress session (survives reloads). Real saves go to the backend.
// Sheet and upload stickers keep their image URL; only legacy built-ins are re-resolved by id.
export const serialize = (d) => ({
  phone: d.phone, caseType: d.caseType, color: d.color, sessionId: d.sessionId,
  sheet: d.sheet || null,
  stickers: d.stickers.map(({ src, ...s }) => (s.kind === 'builtin' ? s : { ...s, src })),
  uploads: d.uploads,
});

export function hydrate(saved) {
  const uploads = saved.uploads || [];
  const stickers = (saved.stickers || [])
    .map((s) => {
      const src = s.kind === 'builtin'
        ? stickerService.findBuiltIn(s.refId)?.src
        : s.src || uploads.find((u) => u.id === s.refId)?.src;
      return src ? { ...s, src } : null;
    })
    .filter(Boolean);
  return {
    phone: saved.phone || null, caseType: saved.caseType || null, color: saved.color || 'pink',
    sessionId: saved.sessionId || '', stickers, uploads, designName: saved.name || '',
    sheet: saved.sheetId ? { id: saved.sheetId, name: saved.sheet?.name || '' } : saved.sheet || null,
  };
}

// ---- guest (not signed in yet) storage -------------------------------------------------------
export const isLocalId = (id) => typeof id === 'string' && id.startsWith('local-');
const hasSession = () => !!storageService.get('token');
const readGuest = () => {
  const list = storageService.get(GUEST, []);
  return Array.isArray(list) ? list : [];
};
const writeGuest = (list) => storageService.set(GUEST, list);
const readMap = () => storageService.get(ID_MAP, {}) || {};

/** After a guest design was synced, its old local id still works through this lookup. */
export const resolveDesignId = (id) => readMap()[id] || id;

const newLocalId = () => `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** True when the server says "this design does not exist (for you)": deleted, other account, or a reset database. */
const isNotFound = (err) => err?.status === 404 || /design not found/i.test(err?.message || '');

function saveLocal(state, { designId, name } = {}) {
  const payload = toPayload(state, name);
  const id = isLocalId(designId) ? designId : newLocalId();
  const list = readGuest();
  const existing = list.find((d) => d.id === id);
  const record = {
    ...serialize(state), id, name: payload.name, payload,
    createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), local: true,
  };
  writeGuest(existing ? list.map((d) => (d.id === id ? record : d)) : [record, ...list]);
  return record;
}

async function saveDesign(state, { designId, name } = {}) {
  if (!hasSession()) return saveLocal(state, { designId, name });
  const realId = resolveDesignId(designId);
  if (realId && !isLocalId(realId)) {
    try {
      return await apiClient.put(`/designs/${realId}`, toPayload(state, name));
    } catch (err) {
      // The remembered design id is stale (deleted, belongs to another account, or the database was reset),
      // e.g. an old draft after starting a design for another phone. Saving must still work: create a new design.
      if (!isNotFound(err)) throw err;
    }
  }
  const created = await apiClient.post('/designs', toPayload(state, name));
  if (isLocalId(designId)) {
    writeGuest(readGuest().filter((d) => d.id !== designId));
    emitDesignGone(designId);
  }
  return created;
}

const mergeList = (local, remote) => (Array.isArray(remote) ? [...local, ...remote] : remote);

export const customizationService = {
  async list() {
    const local = readGuest();
    if (!hasSession()) return local;
    return mergeList(local, await apiClient.get('/designs'));
  },
  async get(id) {
    if (isLocalId(id)) {
      const found = readGuest().find((d) => d.id === id);
      if (found) return found;
      id = resolveDesignId(id);
    }
    return apiClient.get(`/designs/${id}`);
  },
  /** Saves the design (locally for guests) and puts it in the cart. */
  async save(state, opts = {}) {
    const saved = await saveDesign(state, opts);
    emitDesignSaved(saved);
    return saved;
  },
  async remove(id) {
    if (isLocalId(id) && readGuest().some((d) => d.id === id)) {
      writeGuest(readGuest().filter((d) => d.id !== id));
    } else {
      await apiClient.delete(`/designs/${resolveDesignId(id)}`);
    }
    emitDesignGone(id, resolveDesignId(id));
    return null;
  },
  /** Pushes designs saved as a guest to the backend. Returns { localId: backendId } for the ones that went through. */
  async syncGuestDesigns() {
    const local = readGuest();
    if (!local.length || !hasSession()) return {};
    const map = {};
    const left = [];
    for (const d of local) {
      try {
        const created = await apiClient.post('/designs', d.payload);
        map[d.id] = created.id;
      } catch {
        left.push(d);
      }
    }
    writeGuest(left);
    if (Object.keys(map).length) storageService.set(ID_MAP, { ...readMap(), ...map });
    return map;
  },
  saveDraft: (state) => storageService.set(DRAFT, { ...serialize(state), step: state.step, designId: state.designId, name: state.designName }),
  loadDraft: () => storageService.get(DRAFT),
  clearDraft: () => storageService.remove(DRAFT),
};