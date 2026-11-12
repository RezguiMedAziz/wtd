import { API_BASE_URL, ApiError } from './api/apiClient';

// Admin token lives in sessionStorage (cleared when the tab closes), separate from the customer session.
const KEY = 'wtd:adminToken';
export const ADMIN_AUTH_LOST = 'wtd:admin-auth-lost';

const store = {
  get() { try { return window.sessionStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { window.sessionStorage.setItem(KEY, v); } catch { /* ignore */ } },
  remove() { try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};

async function request(path, { as = 'json', signal, method = 'GET', body, form } = {}) {
  const token = store.get();
  if (!token) throw new ApiError('Admin sign-in required.', 401);
  const headers = { Authorization: `Bearer ${token}` };
  let payload;
  if (form) payload = form; // the browser sets the multipart boundary
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/admin${path}`, { method, headers, signal, cache: 'no-store', body: payload });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  if (res.status === 401) {
    store.remove();
    window.dispatchEvent(new Event(ADMIN_AUTH_LOST));
    throw new ApiError('Invalid or expired admin token.', 401);
  }
  if (!res.ok) {
    let detail = null;
    try { detail = (await res.json()).detail; } catch { /* no JSON body */ }
    throw new ApiError(typeof detail === 'string' ? detail : `Request failed (${res.status}).`, res.status);
  }
  if (res.status === 204) return null;
  return as === 'blob' ? res.blob() : res.json();
}

/** Saves a Blob to the user's computer exactly as given (no re-encoding). */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const enc = encodeURIComponent;
const picture = (file, removeBackground) => {
  const f = new FormData();
  f.append('file', file);
  f.append('remove_background', removeBackground ? 'true' : 'false');
  return f;
};

export const adminService = {
  hasToken: () => !!store.get(),
  setToken: (t) => store.set(t.trim()),
  signOut: () => { store.remove(); window.dispatchEvent(new Event(ADMIN_AUTH_LOST)); },

  // ---- dashboard + orders
  stats: (days = 30, opts) => request(`/stats?days=${days}`, opts),
  listOrders: (opts) => request('/orders', opts),
  getOrder: (reference, opts) => request(`/orders/${enc(reference)}`, opts),
  /** Moves the order to another status. Resolves with the updated order. */
  setStatus: (reference, status) => request(`/orders/${enc(reference)}/status`, { method: 'PATCH', body: { status } }),
  /** Original stored file as a Blob (used for previews and downloads). */
  fetchFile: (reference, id, opts) => request(`/orders/${enc(reference)}/files/${enc(id)}`, { ...opts, as: 'blob' }),
  async downloadFile(reference, file) {
    const blob = await this.fetchFile(reference, file.id);
    saveBlob(blob, file.downloadName || `${reference}_${file.id}`);
  },
  /** Frozen copy of a sticker-sheet sticker used by the order (production file). */
  async downloadSheetAsset(reference, asset) {
    const blob = await request(`/orders/${enc(reference)}/assets/${enc(asset.id)}`, { as: 'blob' });
    const ext = (asset.filename || '').split('.').pop() || 'png';
    saveBlob(blob, `${reference}_${(asset.name || 'sticker').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-')}.${ext}`);
  },

  // ---- sticker sheets
  listSheets: (opts) => request('/sheets', opts),
  getSheet: (id, opts) => request(`/sheets/${enc(id)}`, opts),
  createSheet: (name) => request('/sheets', { method: 'POST', body: name ? { name } : {} }),
  saveSheet: (id, body) => request(`/sheets/${enc(id)}`, { method: 'PUT', body }),
  publishSheet: (id) => request(`/sheets/${enc(id)}/publish`, { method: 'POST' }),
  unpublishSheet: (id) => request(`/sheets/${enc(id)}/unpublish`, { method: 'POST' }),
  deleteSheet: (id) => request(`/sheets/${enc(id)}`, { method: 'DELETE' }),
  uploadSheetSticker: (id, file, { removeBackground = true } = {}) =>
    request(`/sheets/${enc(id)}/stickers`, { method: 'POST', form: picture(file, removeBackground) }),
  replaceSheetSticker: (id, stickerId, file, { removeBackground = true } = {}) =>
    request(`/sheets/${enc(id)}/stickers/${enc(stickerId)}/replace`, { method: 'POST', form: picture(file, removeBackground) }),
  deleteSheetSticker: (id, stickerId) => request(`/sheets/${enc(id)}/stickers/${enc(stickerId)}`, { method: 'DELETE' }),

  // ---- sheet background picture (resolves with the updated sheet)
  uploadSheetBackground: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/sheets/${enc(id)}/background`, { method: 'POST', form });
  },
  deleteSheetBackground: (id) => request(`/sheets/${enc(id)}/background`, { method: 'DELETE' }),
};