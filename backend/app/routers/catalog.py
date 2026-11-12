import secrets

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Phone, User
from ..schemas import CustomPhoneIn, PhoneOut
from ..security import optional_user
from ..services.catalog import load_cases, slugify

router = APIRouter(tags=["catalog"])
BRAND_ORDER = ["Apple", "Samsung", "Xiaomi", "Google", "Other"]


@router.get("/phones", response_model=list[PhoneOut])
def search_phones(
    q: str = Query("", max_length=60), brand: str = Query("", max_length=40),
    user: User | None = Depends(optional_user), db: Session = Depends(get_db),
):
    """Search by brand and/or model. Every word of `q` must appear in 'brand + model'."""
    # custom (user-typed) models are only visible to the signed-in user who added them
    if user:
        stmt = select(Phone).where(or_(Phone.custom.is_(False), Phone.created_by == user.id))
    else:
        stmt = select(Phone).where(Phone.custom.is_(False))
    if brand and brand.lower() != "all":
        stmt = stmt.where(Phone.brand == brand)
    for word in slugify(q).split("-"):
        if word:
            stmt = stmt.where((Phone.brand + " " + Phone.name).ilike(f"%{word}%"))
    return db.scalars(stmt.order_by(Phone.custom, Phone.brand, Phone.id)).all()


@router.get("/phones/brands", response_model=list[str])
def brands(db: Session = Depends(get_db)):
    found = set(db.scalars(select(Phone.brand).where(Phone.custom.is_(False)).distinct()))
    return [b for b in BRAND_ORDER if b in found] + sorted(found - set(BRAND_ORDER))


@router.post("/phones/custom", response_model=PhoneOut, status_code=status.HTTP_201_CREATED)
def add_custom_phone(body: CustomPhoneIn, user: User | None = Depends(optional_user), db: Session = Depends(get_db)):
    """A model the user could not find. Works before onboarding. Flagged for catalog verification.

    The id contains a random part, so it cannot be guessed: whoever received it (the visitor who
    typed the model) is the only one who can use it. A visitor's model has created_by NULL until
    they save/order a design, which attaches it to them (see services/designs.py)."""
    name = " ".join(body.name.split())
    if user:  # same signed-in user typing the same model again gets the one they already have
        existing = db.scalar(select(Phone).where(Phone.custom.is_(True), Phone.created_by == user.id, Phone.name == name))
        if existing:
            return existing
    phone = Phone(id=f"custom-{slugify(name)[:80]}-{secrets.token_hex(8)}", brand="Custom", name=name, camera="dual",
                  ratio=2.05, radius=13, color="#E3E0E8", custom=True, needs_verification=True,
                  created_by=user.id if user else None)
    db.add(phone)
    db.commit()
    return phone


@router.get("/cases/config")
def case_config():
    """Case types and silicone color palette."""
    return load_cases()