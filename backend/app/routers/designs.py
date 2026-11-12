from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Design, SheetSticker, Sticker, User
from ..schemas import DesignIn, DesignOut
from ..security import current_user
from ..services.designs import render, validate_design
from ..services.sheets import sticker_url as sheet_sticker_url
from .stickers import sticker_url

router = APIRouter(prefix="/designs", tags=["designs"])


def _ref(s: dict):
    return s.get("refId") or s.get("ref_id")


def _out(db: Session, d: Design) -> DesignOut:
    ids = set(d.upload_ids) | {_ref(s) for s in d.stickers if s.get("kind") == "upload"}
    uploads = list(db.scalars(select(Sticker).where(Sticker.id.in_(ids)))) if ids else []
    sheet_ids = {_ref(s) for s in d.stickers if s.get("kind") == "sheet"}
    sheet_srcs = {}
    if sheet_ids:
        sheet_srcs = {s.id: sheet_sticker_url(s) for s in db.scalars(select(SheetSticker).where(SheetSticker.id.in_(sheet_ids)))}
    extra = render({"stickers": d.stickers, "upload_ids": d.upload_ids}, d.phone, uploads, sticker_url, sheet_srcs)
    return DesignOut(id=d.id, name=d.name, case_type=d.case_type, color=d.color, session_id=d.session_id,
                     sheet_id=d.sheet_id, created_at=d.created_at, updated_at=d.updated_at, **extra)


def _mine(db: Session, user: User, design_id: str) -> Design:
    d = db.get(Design, design_id)
    if not d or d.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found.")
    return d


def _apply(d: Design, body: DesignIn, phone):
    d.name = body.name.strip() or "My design"
    d.phone_id = phone.id
    d.phone = phone
    d.case_type = body.case_type
    d.color = body.color if body.case_type == "silicone" else None
    d.session_id = body.session_id
    d.sheet_id = body.sheet_id
    d.stickers = [s.model_dump(by_alias=False, exclude={"src"}) for s in body.stickers]
    d.upload_ids = list(dict.fromkeys(body.upload_ids))


@router.get("", response_model=list[DesignOut])
def list_designs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Design).where(Design.user_id == user.id).order_by(Design.updated_at.desc()))
    return [_out(db, d) for d in rows]


@router.post("", response_model=DesignOut, status_code=status.HTTP_201_CREATED)
def create_design(body: DesignIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    phone, _, _ = validate_design(db, user, body)
    d = Design(user_id=user.id)
    _apply(d, body, phone)
    db.add(d)
    db.commit()
    return _out(db, d)


@router.get("/{design_id}", response_model=DesignOut)
def get_design(design_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _out(db, _mine(db, user, design_id))


@router.put("/{design_id}", response_model=DesignOut)
def update_design(design_id: str, body: DesignIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    d = _mine(db, user, design_id)
    phone, _, _ = validate_design(db, user, body)
    _apply(d, body, phone)
    db.commit()
    return _out(db, d)


@router.delete("/{design_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_design(design_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_mine(db, user, design_id))
    db.commit()