import { storageService } from '../storageService';


export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/+$/, '');


export class ApiError extends Error {
  constructor(message, status = 0, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

const qs = (params = {}) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  return p.toString() ? `?${p}` : '';
};

function messageFrom(detail, status) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => (d.loc?.length ? `${d.loc.at(-1)}: ${d.msg}` : d.msg)).join(' · ');
  return `Request failed (${status}).`;
}

async function request(path, { method = 'GET', body, form, auth = true, signal } = {}) {
  const headers = {};
  const token = auth ? storageService.get('token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form; // the browser sets the multipart boundary
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload, signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  if (res.status === 401 && token) {
    // the session no longer exists on the server (e.g. database reset): start onboarding again
    storageService.remove('token');
    storageService.remove('user');
    window.location.assign('/onboarding');
  }
  if (!res.ok) {
    let detail = null;
    try { detail = (await res.json()).detail; } catch { /* no JSON body */ }
    throw new ApiError(messageFrom(detail, res.status), res.status, detail);
  }
  return res.status === 204 ? null : res.json();
}

/** REST client for the FastAPI backend (base URL comes from VITE_API_BASE_URL). */
export const apiClient = {
  qs,
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  upload: (path, form, opts) => request(path, { ...opts, method: 'POST', form }),
};
