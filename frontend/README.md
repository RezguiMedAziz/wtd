# What The Duck — Frontend

React + Vite + Tailwind CSS + React Router + Framer Motion + Lucide.
Flow: animated welcome → onboarding form → dashboard with the 4-step **Phones Cases** customizer.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm test           # logic + interaction tests (vitest + jsdom)
# live test against a running backend (real services, real background removal):
#   INTEGRATION=1 VITE_API_BASE_URL=http://127.0.0.1:8000/api npx vitest run src/integration.test.js
```
Node 18+ required. Copy `.env.example` to `.env` if your backend is not on http://localhost:8000.

## The customizer
1. **Phone** — searchable catalog (`src/constants/phones.js`), or type an unknown model (flagged "custom model").
2. **Case** — transparent or silicone; silicone colors in `src/constants/caseColors.js`. The preview is a layered SVG (phone → case → stickers → camera), so color changes redraw the real case.
3. **Stickers** — drag from the collection onto the case (mouse/pen; on touch press-and-hold then drag, or just tap). Move, resize + rotate with the corner handle, delete, size/rotation sliders, keyboard arrows. Up to 15 uploads per session.
4. **Review** — save (localStorage, reopen from "My designs") or order (mock order service, local reference).

### Backend connection
The app talks to the FastAPI backend in `../backend` (`VITE_API_BASE_URL`, default `http://localhost:8000/api`). Start the backend first.
- Onboarding creates the user and a session token on the server.
- Phone search, custom models, case colors, sticker uploads, designs and orders are all API calls (`src/services/*`, one file per area, all through `src/services/api/apiClient.js`).
- Uploaded pictures are processed by the backend (rembg) → transparent PNG URL. If the engine is unavailable the user sees the server's error and no sticker is added.
- Offline alternative: `VITE_BG_REMOVAL_MODE=browser` runs `@imgly/background-removal` in the browser instead.
- The in-progress design (draft) is kept in localStorage so a reload doesn't lose it; saved designs and orders live on the server.

## Structure
- `src/constants` brand colors, characters (**edit duck stories here**), phones, case colors, stickers
- `src/services` storage, phone/case/sticker/customization/order services (all call the API), background removal, sound, `api/apiClient.js`
- `src/controllers` onboarding validation and customization step rules
- `src/context` user, sound, customization session (draft is restored after reload)
- `src/components` ducks, customizer, navigation, layout, forms
- `src/pages` Welcome, Onboarding, Dashboard/PhonesCases

## Assets
- Ducks: `public/assets/ducks/duck-<id>.jpg` — full-frame stills of your six videos (never cropped), ids: sunny, softie, boss, thinky, chaotic, sassy.
- Logo: `public/assets/logo/logo.png` is transparent; the untouched original is `logo-original.png`.
- Stickers: `public/assets/stickers/` (sticker sheet cutouts and duck heads); add more in `src/constants/stickers.js`.
- Everything you supplied is also kept in `public/assets/references/`.
