# What The Duck — full stack

```
what-the-duck/
├── backend/    FastAPI + SQLite + rembg   (port 8000)
└── frontend/   React + Vite + Tailwind    (port 5173)
```

## Start (two terminals, Windows PowerShell)
**1. Backend**
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```
**2. Frontend**
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 — onboarding, then Phones Cases. API docs: http://localhost:8000/docs

Details: `backend/README.md`, `frontend/README.md`.
