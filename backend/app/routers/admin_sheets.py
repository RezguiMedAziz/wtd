"""Admin: manage sticker sheets (create / edit / upload / publish / delete) and download the frozen sheet files of an order.
Every route needs the admin token."""
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Order, SheetSticker, StickerSheet
from ..schemas import SheetCreate, SheetIn, SheetOut, SheetStickerOut
from ..security import require_admin
from ..services import background_removal as br
from ..services.image_utils import InvalidImage
from ..services.sheets import ORDER_DIR, SHEET_DIR, folder, process_image, sheet_out, sticker_out

router = APIRouter(prefix="/admin", tags=["admin-sheets"], dependencies=[Depends(require_admin)])

MAX_STICKERS = 80
CONTENT_TYPES = {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


# ---------- helpers
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sheet_or_404(db: Session, sheet_id: str) -> StickerSheet:
    sheet = db.get(StickerSheet, sheet_id)
    if not sheet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sticker sheet not found.")
    return sheet


def _sticker_or_404(sheet: StickerSheet, sticker_id: str) -> SheetSticker:
    for s in sheet.stickers:
        if s.id == sticker_id:
            return s
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Sticker not found in this sheet.")


def _read_upload(file: UploadFile) -> bytes:
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if not data:
        raise HTTPException(422, "This file is empty.")
    if len(data) > limit:
        raise HTTPException(413, f"Pictures must be under {get_settings().max_upload_mb} MB.")
    return data


def _process(data: bytes, remove_bg: bool):
    try:
        return process_image(data, remove_bg)
    except InvalidImage as exc:
        raise HTTPException(422, str(exc)) from exc
    except br.BackgroundRemovalUnavailable as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc


def _save_file(data: bytes, ext: str) -> str:
    filename = f"{uuid4().hex}.{ext}"
    (folder(SHEET_DIR) / filename).write_bytes(data)
    return filename


def _unlink(filename: str) -> None:
    (folder(SHEET_DIR) / filename).unlink(missing_ok=True)


def _slot(n: int) -> tuple[float, float]:
    """Default position of the n-th sticker: a 4-column grid so new uploads don't pile up on each other."""
    return 14 + (n % 4) * 24, 12 + ((n // 4) % 5) * 19


# ---------- sheets
@router.get("/sheets", response_model=list[SheetOut])
def list_sheets(db: Session = Depends(get_db)):
    rows = db.scalars(select(StickerSheet).order_by(StickerSheet.updated_at.desc()))
    return [sheet_out(s) for s in rows]


@router.post("/sheets", response_model=SheetOut, status_code=status.HTTP_201_CREATED)
def create_sheet(body: SheetCreate, db: Session = Depends(get_db)):
    sheet = StickerSheet(name=body.name.strip() or "Untitled sheet", description="", status="draft")
    db.add(sheet)
    db.commit()
    return sheet_out(sheet)


@router.get("/sheets/{sheet_id}", response_model=SheetOut)
def get_sheet(sheet_id: str, db: Session = Depends(get_db)):
    return sheet_out(_sheet_or_404(db, sheet_id))


@router.put("/sheets/{sheet_id}", response_model=SheetOut)
def update_sheet(sheet_id: str, body: SheetIn, db: Session = Depends(get_db)):
    """Saves name, description, sheet proportions and the position/size/rotation/order of every sticker."""
    sheet = _sheet_or_404(db, sheet_id)
    sheet.name = body.name.strip() or sheet.name
    sheet.description = body.description.strip()
    sheet.ratio = body.ratio
    sheet.background_opacity = body.background_opacity
    by_id = {s.id: s for s in sheet.stickers}
    for item in body.layout:
        s = by_id.get(item.id)
        if s:
            s.x, s.y, s.w, s.rot, s.z = item.x, item.y, item.w, item.rot, item.z
    sheet.updated_at = _now()
    db.commit()
    return sheet_out(sheet)


@router.post("/sheets/{sheet_id}/publish", response_model=SheetOut)
def publish_sheet(sheet_id: str, db: Session = Depends(get_db)):
    sheet = _sheet_or_404(db, sheet_id)
    if not sheet.stickers:
        raise HTTPException(422, "Add at least one sticker before publishing.")
    sheet.status = "published"
    sheet.published_at = _now()
    sheet.updated_at = _now()
    db.commit()
    return sheet_out(sheet)


@router.post("/sheets/{sheet_id}/unpublish", response_model=SheetOut)
def unpublish_sheet(sheet_id: str, db: Session = Depends(get_db)):
    sheet = _sheet_or_404(db, sheet_id)
    sheet.status = "draft"
    sheet.updated_at = _now()
    db.commit()
    return sheet_out(sheet)


@router.delete("/sheets/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sheet(sheet_id: str, db: Session = Depends(get_db)):
    """Deletes the sheet and its live files. Submitted orders keep their own frozen copies and are not affected."""
    sheet = _sheet_or_404(db, sheet_id)
    files = [s.filename for s in sheet.stickers]
    if sheet.background:
        files.append(sheet.background)
    db.delete(sheet)
    db.commit()
    for f in files:
        _unlink(f)


# ---------- background picture of a sheet
@router.post("/sheets/{sheet_id}/background", response_model=SheetOut)
def set_background(sheet_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads (or replaces) the full-page picture shown behind the sheet. Never cut out: it is kept as it is."""
    sheet = _sheet_or_404(db, sheet_id)
    image, ext, _aspect = _process(_read_upload(file), False)
    old = sheet.background
    sheet.background = _save_file(image, ext)
    sheet.updated_at = _now()
    db.commit()
    if old:
        _unlink(old)
    return sheet_out(sheet)


@router.delete("/sheets/{sheet_id}/background", response_model=SheetOut)
def clear_background(sheet_id: str, db: Session = Depends(get_db)):
    sheet = _sheet_or_404(db, sheet_id)
    old = sheet.background
    sheet.background = None
    sheet.updated_at = _now()
    db.commit()
    if old:
        _unlink(old)
    return sheet_out(sheet)


# ---------- stickers of a sheet
@router.post("/sheets/{sheet_id}/stickers", response_model=SheetStickerOut, status_code=status.HTTP_201_CREATED)
def add_sticker(
    sheet_id: str, file: UploadFile = File(...), remove_background: bool = Form(True), db: Session = Depends(get_db),
):
    """Upload one picture as an independent sticker. remove_background=false keeps the picture as it is."""
    sheet = _sheet_or_404(db, sheet_id)
    if len(sheet.stickers) >= MAX_STICKERS:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A sheet can hold at most {MAX_STICKERS} stickers.")
    image, ext, aspect = _process(_read_upload(file), remove_background)
    filename = _save_file(image, ext)
    x, y = _slot(len(sheet.stickers))
    sticker = SheetSticker(
        sheet_id=sheet.id, filename=filename, original_name=Path(file.filename or "sticker").name[:200], aspect=aspect,
        kept_background=not remove_background, x=x, y=y, w=18 if aspect > 1.25 else 22, rot=0,
        z=max((s.z for s in sheet.stickers), default=-1) + 1,
    )
    db.add(sticker)
    sheet.updated_at = _now()
    db.commit()
    return sticker_out(sticker)


@router.post("/sheets/{sheet_id}/stickers/{sticker_id}/replace", response_model=SheetStickerOut)
def replace_sticker(
    sheet_id: str, sticker_id: str, file: UploadFile = File(...), remove_background: bool = Form(True),
    db: Session = Depends(get_db),
):
    """Swaps the image of a sticker; its position, size and rotation on the sheet are kept."""
    sheet = _sheet_or_404(db, sheet_id)
    sticker = _sticker_or_404(sheet, sticker_id)
    image, ext, aspect = _process(_read_upload(file), remove_background)
    old = sticker.filename
    sticker.filename = _save_file(image, ext)
    sticker.aspect = aspect
    sticker.kept_background = not remove_background
    sticker.original_name = Path(file.filename or "sticker").name[:200]
    sheet.updated_at = _now()
    db.commit()
    _unlink(old)
    return sticker_out(sticker)


@router.delete("/sheets/{sheet_id}/stickers/{sticker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sticker(sheet_id: str, sticker_id: str, db: Session = Depends(get_db)):
    sheet = _sheet_or_404(db, sheet_id)
    sticker = _sticker_or_404(sheet, sticker_id)
    filename = sticker.filename
    db.delete(sticker)
    sheet.updated_at = _now()
    db.commit()
    _unlink(filename)


# ---------- production files of an order (frozen sheet stickers)
@router.get("/orders/{reference}/assets/{asset_id}")
def download_order_asset(reference: str, asset_id: str, db: Session = Depends(get_db)):
    """Streams the frozen copy of a sheet sticker used by this order, untouched (no re-encoding)."""
    order = db.get(Order, reference)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    designs = [i.design for i in order.items] or ([order.design] if order.design else [])
    asset = next((a for d in designs for a in (d.get("sheetAssets") or []) if a.get("id") == asset_id), None)
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found in this order.")
    base = folder(ORDER_DIR).resolve()
    path = (base / asset["filename"]).resolve()
    if path.parent != base or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This file is no longer available.")
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(asset.get("name") or "sticker").stem).strip("-._")[:40] or "sticker"
    return FileResponse(
        path, media_type=CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream"),
        filename=f"{reference}_{stem}_{asset_id[:6]}{path.suffix.lower()}",
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )