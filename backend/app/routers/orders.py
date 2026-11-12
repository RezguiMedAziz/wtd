import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Order, OrderEvent, OrderItem, StickerSheet, User
from ..schemas import DesignIn, OrderEventOut, OrderIn, OrderItemOut, OrderOut, UserOut
from ..security import current_user
from ..services.designs import render, validate_design
from ..services.order_flow import CANCELLED, CONFIRMED, CUSTOMER_CANCELLABLE, order_total, utc
from ..services.sheets import freeze_sticker
from .stickers import sticker_url

router = APIRouter(prefix="/orders", tags=["orders"])
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _reference(db: Session) -> str:
    while True:
        ref = "WTD-" + "".join(secrets.choice(ALPHABET) for _ in range(7))
        if not db.get(Order, ref):
            return ref


def _snapshot(db: Session, d: DesignIn, phone, uploads, sheet_stickers, design_id: str | None, created: list[Path]) -> dict:
    """Immutable copy of one design: phone, case, color, placed stickers, uploaded pictures, unit price and
    FROZEN COPIES of every sticker-sheet file used (so later sheet edits/deletes never affect the order)."""
    frozen: dict[str, dict] = {}
    for s in d.stickers:
        if s.kind == "sheet" and s.ref_id in sheet_stickers and s.ref_id not in frozen:
            st = sheet_stickers[s.ref_id]
            frozen[s.ref_id] = freeze_sticker(st, st.sheet.name, created)

    sheet = None
    if d.sheet_id:
        row = db.get(StickerSheet, d.sheet_id)
        sheet = {"id": d.sheet_id, "name": row.name if row else None}

    snapshot = {
        "name": d.name, "caseType": d.case_type, "color": d.color if d.case_type == "silicone" else None,
        "needsVerification": phone.needs_verification, "designId": design_id,
        "unitPrice": get_settings().case_price,
        "sheet": sheet, "sheetAssets": list(frozen.values()),
    }
    parts = render(
        {"stickers": [s.model_dump() for s in d.stickers], "upload_ids": d.upload_ids},
        phone, uploads, sticker_url, {sid: a["src"] for sid, a in frozen.items()},
    )
    snapshot.update({k: ([x.model_dump(by_alias=True) for x in v] if isinstance(v, list) else v.model_dump(by_alias=True)) for k, v in parts.items()})
    return snapshot


def _out(order: Order) -> OrderOut:
    items = [OrderItemOut(design_id=i.design_id, quantity=i.quantity, design=i.design) for i in order.items]
    if not items and order.design:  # orders placed before multi-design support: one design in the legacy column
        items = [OrderItemOut(design_id=order.design.get("designId"), quantity=order.quantity, design=order.design)]
    history = [OrderEventOut(status=e.status, actor=e.actor, created_at=utc(e.created_at)) for e in order.events]
    if not history:  # orders placed before status history existed
        history = [OrderEventOut(status=CONFIRMED, actor="customer", created_at=utc(order.created_at))]
    return OrderOut(
        reference=order.reference, status=order.status, quantity=order.quantity, notes=order.notes,
        customer=order.customer, items=items, created_at=utc(order.created_at),
        total=order_total(order), currency=get_settings().currency,
        can_cancel=order.status in CUSTOMER_CANCELLABLE, history=history,
    )


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(body: OrderIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """MOCK checkout: validates EVERY design first (all or nothing), stores an immutable snapshot of each one
    as an order item of a single order, and returns one reference.
    Payment, shipping and production hand-off are intentionally not implemented yet."""
    validated = []
    for item in body.items:
        try:
            phone, uploads, sheet_stickers = validate_design(db, user, item.design)
        except HTTPException as exc:
            raise HTTPException(exc.status_code, f"“{item.design.name}”: {exc.detail}") from exc
        validated.append((item, phone, uploads, sheet_stickers))

    created: list[Path] = []  # frozen files written for this order (removed again if the order fails)
    try:
        lines = [
            (item, _snapshot(db, item.design, phone, uploads, sheet_stickers, item.design_id, created))
            for item, phone, uploads, sheet_stickers in validated
        ]
        order = Order(
            reference=_reference(db), user_id=user.id, status=CONFIRMED,
            quantity=sum(item.quantity for item, _ in lines), notes=body.notes,
            customer=UserOut.model_validate(user).model_dump(by_alias=True),
            design=lines[0][1],  # legacy column, kept so databases created before multi-design orders keep working
        )
        order.items = [
            OrderItem(position=n, design_id=item.design_id, quantity=item.quantity, design=snap)
            for n, (item, snap) in enumerate(lines)
        ]
        order.events = [OrderEvent(status=CONFIRMED, actor="customer")]
        db.add(order)
        db.commit()
    except Exception:
        db.rollback()
        for p in created:
            p.unlink(missing_ok=True)
        raise
    return _out(order)


@router.get("", response_model=list[OrderOut])
def list_orders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()))
    return [_out(o) for o in rows]


@router.get("/{reference}", response_model=OrderOut)
def get_order(reference: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    order = db.get(Order, reference)
    if not order or order.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    return _out(order)


@router.post("/{reference}/cancel", response_model=OrderOut)
def cancel_order(reference: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """The customer cancels their own order, only while it has not started being prepared."""
    order = db.get(Order, reference)
    if not order or order.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    if order.status == CANCELLED:
        return _out(order)
    if order.status not in CUSTOMER_CANCELLABLE:
        raise HTTPException(status.HTTP_409_CONFLICT, "This order is already being prepared and can no longer be cancelled. Please contact us.")
    order.status = CANCELLED
    order.events.append(OrderEvent(status=CANCELLED, actor="customer"))
    db.commit()
    return _out(order)