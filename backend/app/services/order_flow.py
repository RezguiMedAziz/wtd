"""Order status rules + pricing helpers (shared by the customer and admin routers)."""
from datetime import datetime, timezone

from ..config import get_settings

CONFIRMED, PREPARING, PREPARED, SHIPPED, DELIVERED, CANCELLED = (
    "confirmed", "preparing", "prepared", "shipped", "delivered", "cancelled",
)
FLOW = [CONFIRMED, PREPARING, PREPARED, SHIPPED, DELIVERED]
ALL_STATUSES = FLOW + [CANCELLED]
ACTIVE = {CONFIRMED, PREPARING, PREPARED, SHIPPED}   # not finished, not cancelled
CUSTOMER_CANCELLABLE = {CONFIRMED}                   # the customer can cancel until preparation starts


def utc(dt: datetime) -> datetime:
    """SQLite returns naive datetimes: they are UTC, so say so (otherwise browsers read them as local time)."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def unit_price(design: dict) -> float:
    try:
        return float(design.get("unitPrice"))
    except (TypeError, ValueError):  # orders placed before prices were stored
        return get_settings().case_price


def order_total(order) -> float:
    lines = [(i.quantity, i.design) for i in order.items]
    if not lines and order.design:  # legacy single-design order
        lines = [(order.quantity, order.design)]
    return round(sum(q * unit_price(d) for q, d in lines), 2)