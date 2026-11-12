// shade('#ff7fbd', -0.2) darkens by 20%, shade(hex, 0.2) lightens.
export function shade(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (v) => Math.round(Math.min(255, Math.max(0, amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
