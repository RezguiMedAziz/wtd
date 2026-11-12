import { COLORS } from './colors';
import { CHARACTERS, CHARACTER_ORDER } from './characters';

const base = import.meta.env.BASE_URL;
const INK = COLORS.ink;
const svg = (w, h, body) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;
const FONT = "font-family=\"'Arial Rounded MT Bold','Fredoka',Arial,sans-serif\" font-weight=\"900\"";
const word = (text, fill, w = 260, size = 54) =>
  svg(w, 110, `<rect x="6" y="6" width="${w - 12}" height="98" rx="49" fill="${fill}" stroke="${INK}" stroke-width="7"/><text x="${w / 2}" y="${55 + size * 0.35}" text-anchor="middle" font-size="${size}" ${FONT} fill="${INK}">${text}</text>`);
const flower = (c) =>
  svg(120, 120, [0, 72, 144, 216, 288].map((a) => `<circle cx="60" cy="60" r="22" fill="${c}" stroke="${INK}" stroke-width="5" transform="rotate(${a} 60 60) translate(0 -26)"/>`).join('') + `<circle cx="60" cy="60" r="16" fill="${COLORS.yellow}" stroke="${INK}" stroke-width="5"/>`);
const sparkle = (c) => svg(100, 100, `<path d="M50 6 C54 34 66 46 94 50 C66 54 54 66 50 94 C46 66 34 54 6 50 C34 46 46 34 50 6Z" fill="${c}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`);
const heart = (c) => svg(110, 100, `<path d="M55 92 C10 58 4 30 24 14 C38 4 52 12 55 26 C58 12 72 4 86 14 C106 30 100 58 55 92Z" fill="${c}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M28 30 C32 22 40 20 44 24" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>`);
const star = (c) => svg(110, 105, `<path d="M55 8 L68 38 L100 41 L76 62 L83 94 L55 77 L27 94 L34 62 L10 41 L42 38Z" fill="${c}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`);
const cloud = (c) => svg(150, 95, `<path d="M38 82 C10 82 6 50 30 46 C30 24 60 14 76 32 C92 14 126 24 120 52 C144 54 142 82 118 82Z" fill="${c}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`);
const bubble = (c) => svg(100, 100, `<circle cx="50" cy="50" r="42" fill="${c}" fill-opacity=".55" stroke="${INK}" stroke-width="5"/><path d="M26 40 C30 28 40 22 52 22" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>`);
const bolt = () => svg(80, 110, `<path d="M48 6 L10 62 H36 L28 104 L70 44 H44Z" fill="${COLORS.yellow}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`);
const print = () => svg(110, 110, `<g fill="${COLORS.yellow}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"><path d="M55 96 L28 70 C20 56 36 44 55 58 C74 44 90 56 82 70Z"/><path d="M20 38 C14 20 30 14 34 30 C36 38 24 48 20 38Z"/><path d="M55 20 C50 2 66 -2 66 20 C66 32 56 34 55 20Z" transform="translate(-4 8)"/><path d="M90 38 C96 20 80 14 76 30 C74 38 86 48 90 38Z"/></g>`);

const ar = (w, h) => h / w;
const duckPng = (id, label, w, h) => ({ id: `duck-${id}`, label, category: 'ducks', src: `${base}assets/stickers/duck-${id}.png`, ar: ar(w, h) });

const HEAD_AR = { sunny: 329 / 380, softie: 348 / 380, boss: 378 / 368, thinky: 347 / 330, chaotic: 335 / 375, sassy: 291 / 380 };

/** Built-in sticker collection. Add new stickers here (or drop PNGs in public/assets/stickers). */
export const BUILT_IN_STICKERS = [
  ...CHARACTER_ORDER.map((id) => ({ id: `head-${id}`, label: `${CHARACTERS[id].name}`, category: 'ducks', src: CHARACTERS[id].head, ar: HEAD_AR[id] })),
  duckPng('this-is-fine', 'This is fine', 420, 348),
  duckPng('on-fire', 'On fire', 420, 376),
  duckPng('duct-tape', 'Duct tape', 360, 391),
  duckPng('ew-tasks', 'Ew, tasks', 420, 373),
  duckPng('esc', 'ESC', 420, 362),
  duckPng('hocus-pocus', 'Hocus pocus', 420, 291),
  duckPng('wow', 'Wow', 385, 314),
  duckPng('tired', 'Tired', 420, 200),
  { id: 'heart-pink', label: 'Pink heart', category: 'cute', src: heart(COLORS.pink), ar: 100 / 110 },
  { id: 'heart-blue', label: 'Blue heart', category: 'cute', src: heart(COLORS.blue), ar: 100 / 110 },
  { id: 'star-yellow', label: 'Yellow star', category: 'cute', src: star(COLORS.yellow), ar: 105 / 110 },
  { id: 'star-pink', label: 'Pink star', category: 'cute', src: star(COLORS.pink), ar: 105 / 110 },
  { id: 'flower-pink', label: 'Pink flower', category: 'cute', src: flower(COLORS.pink), ar: 1 },
  { id: 'flower-blue', label: 'Blue flower', category: 'cute', src: flower(COLORS.blue), ar: 1 },
  { id: 'sparkle-yellow', label: 'Sparkle', category: 'cute', src: sparkle(COLORS.yellow), ar: 1 },
  { id: 'sparkle-blue', label: 'Blue sparkle', category: 'cute', src: sparkle(COLORS.blue), ar: 1 },
  { id: 'cloud-blue', label: 'Cloud', category: 'cute', src: cloud(COLORS.sky), ar: 95 / 150 },
  { id: 'cloud-pink', label: 'Pink cloud', category: 'cute', src: cloud(COLORS.blush), ar: 95 / 150 },
  { id: 'bubble-blue', label: 'Bubble', category: 'cute', src: bubble(COLORS.blue), ar: 1 },
  { id: 'bolt', label: 'Lightning', category: 'cute', src: bolt(), ar: 110 / 80 },
  { id: 'footprint', label: 'Duck footprint', category: 'cute', src: print(), ar: 1 },
  { id: 'word-quack', label: 'QUACK!', category: 'words', src: word('QUACK!', COLORS.yellow), ar: 110 / 260 },
  { id: 'word-wtd', label: 'WHAT THE DUCK', category: 'words', src: word('WHAT THE DUCK?', COLORS.pink, 420, 44), ar: 110 / 420 },
  { id: 'word-vibes', label: 'GOOD VIBES', category: 'words', src: word('GOOD VIBES', COLORS.blue, 340, 46), ar: 110 / 340 },
  { id: 'word-inner', label: 'Inner duck', category: 'words', src: word('INNER DUCK', COLORS.blush, 360, 46), ar: 110 / 360 },
  { id: 'word-nope', label: 'NOPE.', category: 'words', src: word('NOPE.', COLORS.sky, 240, 54), ar: 110 / 240 },
  { id: 'word-fine', label: 'I’M FINE', category: 'words', src: word('I’M FINE', COLORS.butter, 300, 54), ar: 110 / 300 },
];
export const STICKER_CATEGORIES = [
  { id: 'all', label: 'All' }, { id: 'ducks', label: 'Ducks' }, { id: 'cute', label: 'Cute' }, { id: 'words', label: 'Words' },
];
