// Checkerboard so PNG transparency is visible.
export const CHECKER = {
  backgroundImage: 'conic-gradient(#ece9f3 25%, #ffffff 0 50%, #ece9f3 0 75%, #ffffff 0)',
  backgroundSize: '16px 16px',
};

export const sortedStickers = (sheet) => [...(sheet?.stickers || [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

/** Sheet stickers -> the shape StickerLayer renders (same component the phone editor uses). */
export const toLayerStickers = (sheet) =>
  sortedStickers(sheet).map((s) => ({ uid: s.id, kind: 'sheet', refId: s.id, src: s.src, ar: s.ar, x: s.x, y: s.y, w: s.w, rot: s.rot || 0 }));