from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .config import get_settings
from .database import Base, SessionLocal, engine
from .routers import admin, admin_sheets, catalog, designs, orders, sheets, stickers, users
from .services.catalog import seed_phones


def _ensure_columns() -> None:
    """create_all() only creates missing TABLES. Columns added after the first release are added here (idempotent)."""
    cols = {c["name"] for c in inspect(engine).get_columns("designs")}
    if "sheet_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE designs ADD COLUMN sheet_id VARCHAR(32)"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    for sub in ("stickers", "sheets", "order_assets"):
        (settings.media_path / sub).mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)  # simple bootstrap; switch to Alembic migrations before production
    _ensure_columns()
    with SessionLocal() as db:
        seed_phones(db)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="What The Duck API", version="0.2.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=False,
        allow_methods=["*"], allow_headers=["*"],
    )
    for r in (users.router, catalog.router, stickers.router, sheets.router, designs.router, orders.router,
              admin.router, admin_sheets.router):
        app.include_router(r, prefix="/api")

    @app.get("/api/health", tags=["health"])
    def health():
        return {"status": "ok"}

    for sub in ("stickers", "sheets", "order_assets"):
        (settings.media_path / sub).mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.media_path), name="media")
    return app


app = create_app()