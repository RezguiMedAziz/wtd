import { CHARACTERS, CHARACTER_ORDER } from './characters';

const base = import.meta.env.BASE_URL;

export const DUCKS = Object.fromEntries(
  Object.entries(CHARACTERS).map(([id, c]) => [id, { src: c.src, label: `${c.name}, ${c.tagline.toLowerCase()}` }])
);
export const DUCK_NAMES = CHARACTER_ORDER;
export const LOGO_SRC = `${base}assets/logo/logo.png`; // transparent logo (original kept as logo-original.png)
