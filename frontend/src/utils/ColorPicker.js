// Small HSV <-> hex helpers for the silicone color wheel.
export const HEX_RE = /^#[0-9a-f]{6}$/i;
export const isHex = (v) => typeof v === 'string' && HEX_RE.test(v);

/** h: 0-360, s: 0-1, v: 0-1 -> '#rrggbb' */
export function hsvToHex(h, s, v) {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let rgb;
  if (hh < 1) rgb = [c, x, 0];
  else if (hh < 2) rgb = [x, c, 0];
  else if (hh < 3) rgb = [0, c, x];
  else if (hh < 4) rgb = [0, x, c];
  else if (hh < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = v - c;
  return `#${rgb.map((n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** '#rrggbb' -> { h: 0-360, s: 0-1, v: 0-1 } */
export function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}