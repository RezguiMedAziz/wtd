# What The Duck — Backend (FastAPI)

FastAPI + SQLAlchemy (SQLite by default) + rembg for sticker background removal.

## Run (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```
macOS/Linux: `source .venv/bin/activate` and `cp .env.example .env`.
Python 3.10–3.12 recommended. API docs: http://localhost:8000/docs

The first sticker upload downloads the segmentation model once (u2netp ≈ 5 MB; set `REMBG_MODEL=u2net` in `.env` for higher quality, ≈ 170 MB). The database file is created automatically in `backend/data/`.

## Endpoints (prefix `/api`)
| Method | Path | Notes |
|---|---|---|
| POST | `/users` | onboarding → returns the user and a session `token` (send `Authorization: Bearer <token>`) |
| GET/PUT | `/users/me` | profile |
| GET | `/phones?q=&brand=` | catalog search (all words must match brand + model) |
| GET | `/phones/brands` | brand list |
| POST | `/phones/custom` | model not in the catalog → stored and flagged `needsVerification` (visible only to its creator) |
| GET | `/cases/config` | case types and silicone colors |
| POST | `/stickers/remove-background` | multipart `file` + `session_id`; removes the background, stores a transparent PNG, returns `{id, src, ar}`; max 15 per session, 12 MB, PNG/JPEG/WebP |
| GET/DELETE | `/stickers` , `/stickers/{id}` | list per session / delete |
| GET/POST/PUT/DELETE | `/designs` , `/designs/{id}` | save, reopen, edit, delete designs |
| POST | `/orders` | **mock** order: validates the design, stores a snapshot, returns `WTD-XXXXXXX` |
| GET | `/orders` , `/orders/{reference}` | order history |
Uploaded images are served from `/media/stickers/...`.

## Structure
`app/main.py` (app, CORS, startup) · `routers/` (one file per area) · `services/` (background removal, image validation, catalog, design validation) · `models.py` · `schemas.py` (camelCase JSON) · `security.py` · `data/phones.json` and `data/cases.json` (edit the catalog here).

## Tests
`python -m pytest` — 12 API tests (the ML model is replaced by a fake in these so they run offline). Real background removal is exercised by the frontend integration test (see frontend README).

## Not implemented yet (by design)
Passwords/accounts (a session token is issued at onboarding), payments, shipping, admin catalog verification, Alembic migrations, rate limiting. Before production: use PostgreSQL via `DATABASE_URL`, HTTPS, store media on object storage, and add auth.
