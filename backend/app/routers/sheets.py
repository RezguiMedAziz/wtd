"""Customer-facing sticker sheets: ONLY published sheets are ever returned."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import StickerSheet
from ..schemas import SheetOut
from ..services.sheets import sheet_out

router = APIRouter(prefix="/sheets", tags=["sheets"])


@router.get("", response_model=list[SheetOut])
def list_published(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StickerSheet).where(StickerSheet.status == "published").order_by(StickerSheet.published_at.desc())
    )
    return [sheet_out(s) for s in rows if s.stickers]


@router.get("/{sheet_id}", response_model=SheetOut)
def get_published(sheet_id: str, db: Session = Depends(get_db)):
    sheet = db.get(StickerSheet, sheet_id)
    if not sheet or sheet.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This sticker sheet is not available.")
    return sheet_out(sheet)