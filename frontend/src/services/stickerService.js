import { BUILT_IN_STICKERS } from '../constants/stickers';
import { apiClient } from './api/apiClient';

export const MAX_UPLOADS = 15;
export const MAX_FILE_MB = 12;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
export const ACCEPT_ATTR = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

export const stickerService = {
  // LEGACY: the old built-in collection is no longer offered to customers (stickers now come from sticker sheets
  // or from uploads). This lookup only exists so OLD saved designs / orders that used them can still be displayed.
  findBuiltIn: (id) => BUILT_IN_STICKERS.find((s) => s.id === id) || null,
  // best effort: removes the uploaded image from the server
  deleteUpload: (id) => apiClient.delete(`/stickers/${id}`).catch(() => null),
};

/** Quick client-side checks (the server validates again). */
export function validateUploads(files, remainingSlots) {
  const accepted = [];
  const rejected = [];
  Array.from(files).forEach((file) => {
    if (!ACCEPTED.includes(file.type)) rejected.push({ name: file.name, reason: 'Only PNG, JPG and WebP pictures are supported.' });
    else if (file.size === 0) rejected.push({ name: file.name, reason: 'This file is empty.' });
    else if (file.size > MAX_FILE_MB * 1024 * 1024) rejected.push({ name: file.name, reason: `Pictures must be under ${MAX_FILE_MB} MB.` });
    else if (accepted.length >= remainingSlots) rejected.push({ name: file.name, reason: `Upload limit reached (${MAX_UPLOADS} stickers per session).` });
    else accepted.push(file);
  });
  return { accepted, rejected };
}