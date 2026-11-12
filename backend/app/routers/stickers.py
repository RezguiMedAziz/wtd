from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
import json
from ..config import get_settings
from ..database import get_db
from ..models import Order, OrderItem, Sticker, User   # add Order, OrderItem
from ..schemas import StickerOut
from ..security import optional_user
from ..services import background_removal
from ..services.image_utils import InvalidImage

router = APIRouter(prefix="/stickers", tags=["stickers"])


def sticker_url(s: Sticker) -> str:
    return f"{get_settings().public_base_url.rstrip('/')}/media/stickers/{s.filename}"


def to_out(s: Sticker) -> StickerOut:
    # Convention: pictures whose background was kept are stored as .webp, cut-outs as .png.
    return StickerOut(id=s.id, name=s.original_name, src=sticker_url(s), ar=s.aspect,
                      kept_background=s.filename.lower().endswith(".webp"))


def _used_by_order(db: Session, s: Sticker) -> bool:
    if s.user_id is None:
        return False
    items = db.scalars(select(OrderItem.design).join(Order, OrderItem.order_id == Order.reference).where(Order.user_id == s.user_id))
    legacy = db.scalars(select(Order.design).where(Order.user_id == s.user_id, Order.design.is_not(None)))
    return any(s.id in json.dumps(d) for d in [*items, *legacy])

def _owner(user: User | None):
    """Signed-in users own their stickers; visitors who have not onboarded yet own the unclaimed ones (user_id NULL)."""
    return Sticker.user_id == user.id if user else Sticker.user_id.is_(None)


@router.post("/remove-background", response_model=StickerOut, status_code=status.HTTP_201_CREATED)
async def upload_sticker(
    file: UploadFile = File(...), session_id: str = Form(..., min_length=1, max_length=64),
    keep_background: bool = Form(False),
    user: User | None = Depends(optional_user), db: Session = Depends(get_db),
):
    """Upload a picture → background removed → stored as a transparent PNG sticker.
    With keep_background=true the segmentation model is skipped: the picture is only resized
    (full-case artwork) and stored as WebP. The response's keptBackground tells which path ran.
    Works before onboarding: the sticker is attached to the user when the design is saved/ordered."""
    settings = get_settings()
    used = db.scalar(select(func.count()).select_from(Sticker).where(_owner(user), Sticker.session_id == session_id))
    if used >= settings.max_uploads_per_session:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Upload limit reached ({settings.max_uploads_per_session} stickers per session).")

    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not data:
        raise HTTPException(422, "This file is empty.")
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Pictures must be under {settings.max_upload_mb} MB.")

    try:
        if keep_background:
            image, aspect = background_removal.keep_picture(data)
            ext = "webp"
        else:
            image, aspect = background_removal.remove_background(data)
            ext = "png"
    except InvalidImage as exc:
        raise HTTPException(422, str(exc)) from exc
    except background_removal.BackgroundRemovalUnavailable as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc

    folder = settings.media_path / "stickers"
    folder.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.{ext}"
    (folder / filename).write_bytes(image)
    sticker = Sticker(user_id=user.id if user else None, session_id=session_id, filename=filename,
                      original_name=Path(file.filename or "picture").name[:200], aspect=aspect)
    db.add(sticker)
    db.commit()
    return to_out(sticker)


@router.get("", response_model=list[StickerOut])
def list_stickers(session_id: str, user: User | None = Depends(optional_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Sticker).where(_owner(user), Sticker.session_id == session_id).order_by(Sticker.created_at))
    return [to_out(s) for s in rows]


@router.delete("/{sticker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sticker(sticker_id: str, user: User | None = Depends(optional_user), db: Session = Depends(get_db)):
    s = db.get(Sticker, sticker_id)
    if not s or (s.user_id is not None and (user is None or s.user_id != user.id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sticker not found.")
    if _used_by_order(db, s):
        return  # an order needs this file for production: keep it (still answers 204)
    (get_settings().media_path / "stickers" / s.filename).unlink(missing_ok=True)
    db.delete(s)
    db.commit()