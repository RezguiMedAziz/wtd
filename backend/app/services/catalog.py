import json
import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Phone

DATA = Path(__file__).resolve().parent.parent / "data"


def load_cases() -> dict:
    return json.loads((DATA / "cases.json").read_text(encoding="utf-8"))


def silicone_color_ids() -> set[str]:
    return {c["id"] for c in load_cases()["siliconeColors"]}


def seed_phones(db: Session) -> int:
    """Inserts the bundled catalog (idempotent). Edit app/data/phones.json to change it."""
    existing = set(db.scalars(select(Phone.id)))
    added = 0
    for p in json.loads((DATA / "phones.json").read_text(encoding="utf-8")):
        if p["id"] not in existing:
            db.add(Phone(**p))
            added += 1
    db.commit()
    return added


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower().replace("+", " plus ")).strip("-")
