"""Admin-only endpoints: dashboard stats, browse orders, change status, download the stored design files.
Files are streamed through an authenticated endpoint; storage paths are never returned to the client."""
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Order, OrderEvent, Sticker
from ..schemas import CamelModel, OrderOut, StatusIn
from ..security import require_admin
from ..services.order_flow import ACTIVE, ALL_STATUSES, CANCELLED, order_total, utc
from .orders import _out

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

CONTENT_TYPES = {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


# ---------- schemas
class AdminOrderSummary(CamelModel):
    reference: str
    status: str
    quantity: int
    design_count: int
    customer_name: str
    email: str
    total: float
    currency: str
    created_at: datetime


class AdminFile(CamelModel):
    id: str
    available: bool
    download_name: str = ""
    content_type: str = ""
    size_bytes: int | None = None
    width: int | None = None
    height: int | None = None
    kept_background: bool = False


class AdminOrderDetail(CamelModel):
    order: OrderOut
    files: list[AdminFile]


class DayPoint(CamelModel):
    date: str
    revenue: float
    orders: int


class StatusCount(CamelModel):
    status: str
    count: int


class AdminStats(CamelModel):
    currency: str
    timezone: str
    days: int
    revenue: float            # period, cancelled orders excluded
    revenue_all_time: float
    orders: int               # period, cancelled included
    cancelled: int            # period
    avg_order_value: float
    cases: int                # period, cancelled excluded
    active_orders: int        # all time: placed / being prepared / prepared / shipped
    by_status: list[StatusCount]   # all time
    daily: list[DayPoint]
    by_hour: list[int]        # 24 values, local time
    by_weekday: list[int]     # 7 values, Monday first
    recent: list[AdminOrderSummary]


# ---------- helpers
def _summary(o: Order) -> AdminOrderSummary:
    c = o.customer or {}
    return AdminOrderSummary(
        reference=o.reference, status=o.status, quantity=o.quantity, design_count=len(o.items) or 1,
        customer_name=f"{c.get('firstName', '')} {c.get('lastName', '')}".strip(), email=c.get("email", ""),
        total=order_total(o), currency=get_settings().currency, created_at=utc(o.created_at),
    )


def _tz():
    try:
        return ZoneInfo(get_settings().timezone)
    except Exception:  # noqa: BLE001 - unknown zone / tzdata missing
        return timezone.utc


def _order_or_404(db: Session, reference: str) -> Order:
    order = db.get(Order, reference)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found.")
    return order


def _designs(order: Order) -> list[dict]:
    designs = [i.design for i in order.items]
    if not designs and order.design:  # orders placed before multi-design support
        designs = [order.design]
    return designs


def _upload_ids(order: Order) -> list[str]:
    """Every uploaded sticker referenced by the order's design snapshots (ordered, unique)."""
    found: dict[str, None] = {}
    for d in _designs(order):
        for u in d.get("uploads", []):
            found[u["id"]] = None
        for s in d.get("stickers", []):
            ref = s.get("refId") or s.get("ref_id")
            if s.get("kind") == "upload" and ref:
                found[ref] = None
    return list(found)


def _sticker_path(s: Sticker) -> Path | None:
    folder = (get_settings().media_path / "stickers").resolve()
    path = (folder / s.filename).resolve()
    return path if path.parent == folder and path.is_file() else None


def _download_name(reference: str, s: Sticker) -> str:
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(s.original_name).stem).strip("-._")[:40] or "sticker"
    return f"{reference}_{stem}_{s.id[:6]}{Path(s.filename).suffix.lower()}"


def _file_info(order: Order, sticker_id: str, s: Sticker | None) -> AdminFile:
    path = _sticker_path(s) if s else None
    if not s or not path:
        return AdminFile(id=sticker_id, available=False)
    width = height = None
    try:
        with Image.open(path) as im:
            width, height = im.size
    except Exception:  # noqa: BLE001 - dimensions are informational only
        pass
    return AdminFile(
        id=s.id, available=True, download_name=_download_name(order.reference, s),
        content_type=CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream"),
        size_bytes=path.stat().st_size, width=width, height=height,
        kept_background=s.filename.lower().endswith(".webp"),
    )


# ---------- dashboard
@router.get("/stats", response_model=AdminStats)
def stats(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """Computed in Python over all orders: fine for a small shop. Move to SQL aggregates if volume grows."""
    cfg, tz = get_settings(), _tz()
    today = datetime.now(tz).date()
    first = today - timedelta(days=days - 1)
    daily = {first + timedelta(days=i): [0.0, 0] for i in range(days)}
    by_hour, by_weekday = [0] * 24, [0] * 7
    counts = {s: 0 for s in ALL_STATUSES}
    revenue_all = revenue = 0.0
    orders = cancelled = cases = 0
    everything = list(db.scalars(select(Order).order_by(Order.created_at.desc())))

    for o in everything:
        counts[o.status] = counts.get(o.status, 0) + 1
        total, live = order_total(o), o.status != CANCELLED
        if live:
            revenue_all += total
        local = utc(o.created_at).astimezone(tz)
        if local.date() not in daily:
            continue
        orders += 1
        if not live:
            cancelled += 1
            continue
        revenue += total
        cases += o.quantity
        daily[local.date()][0] += total
        daily[local.date()][1] += 1
        by_hour[local.hour] += 1
        by_weekday[local.weekday()] += 1

    valid = orders - cancelled
    return AdminStats(
        currency=cfg.currency, timezone=str(getattr(tz, "key", "UTC")), days=days,
        revenue=round(revenue, 2), revenue_all_time=round(revenue_all, 2), orders=orders, cancelled=cancelled,
        avg_order_value=round(revenue / valid, 2) if valid else 0, cases=cases,
        active_orders=sum(counts.get(s, 0) for s in ACTIVE),
        by_status=[StatusCount(status=s, count=counts.get(s, 0)) for s in ALL_STATUSES],
        daily=[DayPoint(date=d.isoformat(), revenue=round(v[0], 2), orders=v[1]) for d, v in daily.items()],
        by_hour=by_hour, by_weekday=by_weekday, recent=[_summary(o) for o in everything[:6]],
    )


# ---------- orders
@router.get("/orders", response_model=list[AdminOrderSummary])
def list_orders(db: Session = Depends(get_db)):
    rows = db.scalars(select(Order).order_by(Order.created_at.desc()).limit(500))
    return [_summary(o) for o in rows]


@router.get("/orders/{reference}", response_model=AdminOrderDetail)
def order_detail(reference: str, db: Session = Depends(get_db)):
    order = _order_or_404(db, reference)
    ids = _upload_ids(order)
    rows = {}
    if ids:  # only stickers that belong to the customer who placed the order
        rows = {s.id: s for s in db.scalars(select(Sticker).where(Sticker.id.in_(ids), Sticker.user_id == order.user_id))}
    return AdminOrderDetail(order=_out(order), files=[_file_info(order, i, rows.get(i)) for i in ids])


@router.patch("/orders/{reference}/status", response_model=OrderOut)
def set_status(reference: str, body: StatusIn, db: Session = Depends(get_db)):
    """Admin moves the order through confirmed → preparing → prepared → shipped → delivered.
    Cancelled orders are final. Every change is recorded in the order history."""
    order = _order_or_404(db, reference)
    if order.status == CANCELLED:
        raise HTTPException(status.HTTP_409_CONFLICT, "This order was cancelled and can no longer be changed.")
    if body.status != order.status:
        order.status = body.status
        order.events.append(OrderEvent(status=body.status, actor="admin"))
        db.commit()
    return _out(order)


@router.get("/orders/{reference}/files/{sticker_id}")
def download_file(reference: str, sticker_id: str, db: Session = Depends(get_db)):
    """Streams the stored file untouched (no re-encoding). Only files referenced by this order are reachable."""
    order = _order_or_404(db, reference)
    if sticker_id not in _upload_ids(order):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found in this order.")
    s = db.scalar(select(Sticker).where(Sticker.id == sticker_id, Sticker.user_id == order.user_id))
    path = _sticker_path(s) if s else None
    if not path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This file is no longer available.")
    return FileResponse(
        path, media_type=CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream"),
        filename=_download_name(order.reference, s),
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )