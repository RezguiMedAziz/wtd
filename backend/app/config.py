from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/wtd.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    public_base_url: str = "http://localhost:8000"
    media_dir: str = "./media"
    max_upload_mb: int = 12
    max_uploads_per_session: int = 15
    rembg_model: str = "u2netp"
    admin_token: str = ""   
    admin_token: str = ""
    case_price: float = 40         # keep equal to CASE_PRICE in the frontend (Cartcontext.jsx)
    currency: str = "TND"
    timezone: str = "Africa/Tunis"    # used for "active times" on the dashboard

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def media_path(self) -> Path:
        p = Path(self.media_dir)
        return p if p.is_absolute() else (Path.cwd() / p)


@lru_cache
def get_settings() -> Settings:
    return Settings()
