import { useEffect, useState } from 'react';
import { apiClient } from './api/apiClient';

/** First screen of the design journey (the splash leads here). */
export const SHEETS_PATH = '/dashboard/sticker-sheets';

// Public API: only PUBLISHED sheets are ever returned by the backend.
export const sheetService = {
  list: (opts) => apiClient.get('/sheets', { auth: false, ...opts }),
  get: (id, opts) => apiClient.get(`/sheets/${encodeURIComponent(id)}`, { auth: false, ...opts }),
};

/** Loads one sheet with all its individual stickers (always fresh, so admin edits show up). */
export function useSheet(id) {
  const [state, setState] = useState({ sheet: null, loading: !!id, error: '' });
  useEffect(() => {
    if (!id) { setState({ sheet: null, loading: false, error: '' }); return undefined; }
    const ctl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: '' }));
    sheetService.get(id, { signal: ctl.signal })
      .then((sheet) => setState({ sheet, loading: false, error: '' }))
      .catch((e) => { if (e.name !== 'AbortError') setState({ sheet: null, loading: false, error: e.message }); });
    return () => ctl.abort();
  }, [id]);
  return state;
}