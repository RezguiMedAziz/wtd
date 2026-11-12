import { apiClient } from './api/apiClient';
import { normalizeSticker } from '../utils/image';
import { uploadOptions } from './uploadOptions';

/**
 * Background removal — the UI only calls process(); the engine can change without touching components.
 *
 * VITE_BG_REMOVAL_MODE=api (default): the FastAPI backend (rembg) removes the background, stores the
 *   transparent PNG and returns its URL. Works for guests too (no sign-in needed).
 * VITE_BG_REMOVAL_MODE=browser: offline alternative, @imgly/background-removal runs in the browser
 *   (model downloaded on first use; VITE_BG_REMOVAL_PUBLIC_PATH can point to a self-hosted copy).
 *
 * Keep-background: pass { keepBackground: true } to process() (explicit, decided when the upload starts).
 * When omitted, the sticker panel's checkbox (uploadOptions) is read at call time.
 * The picture is then kept as it is (for full-case artwork). The API answer is checked: if the server
 * did not confirm that the background was kept, the upload fails loudly instead of silently cutting it out.
 * If the engine is unavailable the promise rejects with a readable message — nothing is faked.
 */
export class BackgroundRemovalError extends Error {}

const MODE = import.meta.env.VITE_BG_REMOVAL_MODE || 'api';
const PUBLIC_PATH = import.meta.env.VITE_BG_REMOVAL_PUBLIC_PATH || undefined;

async function viaBrowser(file, onProgress, keepBackground) {
  if (keepBackground) {
    const { src, ar } = await normalizeSticker(file);
    return { src, ar };
  }
  let lib;
  try {
    lib = await import('@imgly/background-removal');
  } catch {
    throw new BackgroundRemovalError('The in-browser background-removal engine could not be loaded.');
  }
  let blob;
  try {
    blob = await lib.removeBackground(file, {
      publicPath: PUBLIC_PATH,
      output: { format: 'image/png' },
      progress: (key, current, total) => onProgress?.({ key, ratio: total ? current / total : 0 }),
    });
  } catch {
    throw new BackgroundRemovalError('Background removal failed. Check your connection (the model downloads on first use) and try again.');
  }
  const { src, ar } = await normalizeSticker(blob);
  return { src, ar };
}

async function viaApi(file, sessionId, keepBackground) {
  const form = new FormData();
  form.append('file', file);
  form.append('session_id', sessionId);
  form.append('keep_background', keepBackground ? 'true' : 'false');
  const r = await apiClient.upload('/stickers/remove-background', form);
  if (keepBackground && r.keptBackground !== true) {
    // The server answered but did not keep the background (outdated backend?): never hand back a cut-out silently.
    if (r.id) apiClient.delete(`/stickers/${r.id}`).catch(() => null);
    throw new BackgroundRemovalError('The server did not keep the original background. Restart the backend with the latest code and try again.');
  }
  return { id: r.id, src: r.src, ar: r.ar, name: r.name };
}

export const backgroundRemovalService = {
  mode: MODE,
  /** @returns {Promise<{id?: string, src: string, ar: number}>} sticker image (transparent, or untouched when keepBackground) */
  process(file, { onProgress, sessionId, keepBackground } = {}) {
    const keep = typeof keepBackground === 'boolean' ? keepBackground : uploadOptions.keepBackground;
    return MODE === 'browser' ? viaBrowser(file, onProgress, keep) : viaApi(file, sessionId, keep);
  },
};