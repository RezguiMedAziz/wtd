import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { customizationService, hydrate } from '../services/customizationService';
import { canEnterStep } from '../controllers/customizationController';

const Ctx = createContext(null);

const sessionId = () => `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// `sheet` = the sticker sheet picked in the marketplace: { id, name } (its stickers are loaded by the sticker panel).
const fresh = () => ({
  sessionId: sessionId(), designName: '', step: 1, phone: null, caseType: null, color: 'pink', stickers: [], uploads: [], pending: [],
  selectedUid: null, designId: null, checkout: 'review', order: null, sheet: null,
});

function init() {
  const draft = customizationService.loadDraft();
  if (!draft) return fresh();
  const h = hydrate(draft);
  const base = { ...fresh(), ...h, sessionId: h.sessionId || sessionId(), designName: draft.name || '', designId: draft.designId || null };
  const step = canEnterStep(draft.step || 1, base) ? Math.min(draft.step || 1, 4) : 1;
  return { ...base, step };
}

const uid = () => `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function reducer(s, a) {
  switch (a.type) {
    case 'go': return canEnterStep(a.step, s) ? { ...s, step: a.step, selectedUid: null, checkout: 'review' } : s;
    case 'setPhone': {
      // Picking a DIFFERENT phone starts a new design: it must not overwrite the one saved for the old phone,
      // and it must not keep that design's auto-generated name ("iPhone 12 design").
      const changed = !!s.phone && a.phone?.id !== s.phone.id;
      return changed ? { ...s, phone: a.phone, designId: null, designName: '' } : { ...s, phone: a.phone };
    }
    case 'setCaseType': return { ...s, caseType: a.value };
    case 'setColor': return { ...s, color: a.value };
    case 'setSheet': return { ...s, sheet: a.value || null };
    case 'addSticker': return { ...s, stickers: [...s.stickers, { uid: uid(), rot: 0, w: 30, x: 50, y: 50, ...a.sticker }], selectedUid: null };
    case 'select': return { ...s, selectedUid: a.uid };
    case 'updateSticker': return { ...s, stickers: s.stickers.map((t) => (t.uid === a.uid ? { ...t, ...a.patch } : t)) };
    case 'removeSticker': return { ...s, stickers: s.stickers.filter((t) => t.uid !== a.uid), selectedUid: s.selectedUid === a.uid ? null : s.selectedUid };
    case 'toFront': { const t = s.stickers.find((x) => x.uid === a.uid); return t ? { ...s, stickers: [...s.stickers.filter((x) => x.uid !== a.uid), t] } : s; }
    case 'clearStickers': return { ...s, stickers: [], selectedUid: null };
    case 'addPending': return { ...s, pending: [...s.pending, a.item] };
    case 'updatePending': return { ...s, pending: s.pending.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };
    case 'removePending': return { ...s, pending: s.pending.filter((p) => p.id !== a.id) };
    case 'addUpload': return { ...s, uploads: [...s.uploads, a.upload] };
    case 'removeUpload': return { ...s, uploads: s.uploads.filter((u) => u.id !== a.id), stickers: s.stickers.filter((t) => !(t.kind === 'upload' && t.refId === a.id)) };
    case 'setCheckout': return { ...s, checkout: a.value };
    case 'setDesignId': return { ...s, designId: a.id, designName: a.name ?? s.designName };
    case 'orderPlaced': return { ...s, order: a.order, checkout: 'done' };
    case 'load': { const h = hydrate(a.design); return { ...fresh(), ...h, sessionId: h.sessionId || sessionId(), designId: a.design.id, step: 3 }; }
    // "design another case" keeps the chosen sticker sheet: most people want the same sheet again
    case 'reset': customizationService.clearDraft(); return { ...fresh(), sheet: s.sheet };
    default: return s;
  }
}

export function CustomizationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const timer = useRef(null);

  // Keep the in-progress design across navigation and reloads.
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (state.checkout === 'done') customizationService.clearDraft();
      else customizationService.saveDraft(state);
    }, 400);
    return () => window.clearTimeout(timer.current);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCustomization = () => useContext(Ctx);