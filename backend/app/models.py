import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _id() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    mobile: Mapped[str] = mapped_column(String(30))
    email: Mapped[str] = mapped_column(String(160), index=True)
    address: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(100))
    postal_code: Mapped[str] = mapped_column(String(20))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Phone(Base):
    """Catalog entry. Custom (user-typed) models live here too, flagged for verification."""
    __tablename__ = "phones"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    brand: Mapped[str] = mapped_column(String(60), index=True)
    name: Mapped[str] = mapped_column(String(80))
    camera: Mapped[str] = mapped_column(String(20), default="dual")
    ratio: Mapped[float] = mapped_column(Float, default=2.05)
    radius: Mapped[float] = mapped_column(Float, default=13)
    color: Mapped[str] = mapped_column(String(9), default="#E3E0E8")
    custom: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_verification: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class Sticker(Base):
    """A processed (background-removed) sticker uploaded by a user.
    user_id is NULL while the visitor has not onboarded yet; it is attached to the user
    (matched by session_id) when they save/order a design."""
    __tablename__ = "stickers"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    filename: Mapped[str] = mapped_column(String(80))
    original_name: Mapped[str] = mapped_column(String(200))
    aspect: Mapped[float] = mapped_column(Float)  # height / width
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Design(Base):
    __tablename__ = "designs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    phone_id: Mapped[str] = mapped_column(ForeignKey("phones.id"))
    case_type: Mapped[str] = mapped_column(String(20))
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)  # normalized '#rrggbb' for silicone cases
    session_id: Mapped[str] = mapped_column(String(64), default="")
    # Sticker sheet the customer picked in the marketplace. Plain string (no FK): deleting a sheet must not touch designs.
    sheet_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    stickers: Mapped[list] = mapped_column(JSON, default=list)      # placed stickers
    upload_ids: Mapped[list] = mapped_column(JSON, default=list)    # uploaded stickers in the collection
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    phone: Mapped[Phone] = relationship(lazy="joined")


class Order(Base):
    """MOCK order: one order holds one or more designs (see OrderItem). No payment / shipping yet."""
    __tablename__ = "orders"
    reference: Mapped[str] = mapped_column(String(24), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="confirmed")
    customer: Mapped[dict] = mapped_column(JSON)
    # Legacy: before multi-design orders this held the single design snapshot. It is still filled with the
    # first design (so older databases whose column is NOT NULL keep working); the source of truth is `items`.
    design: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)  # total number of cases in the order
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.position", lazy="selectin"
    )
    events: Mapped[list["OrderEvent"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderEvent.created_at", lazy="selectin"
    )


class OrderItem(Base):
    """One design inside an order: an immutable snapshot (phone, case, color, stickers, uploads) + quantity."""
    __tablename__ = "order_items"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.reference", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    design_id: Mapped[str | None] = mapped_column(String(32), nullable=True)  # saved design it came from (may be deleted later)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    design: Mapped[dict] = mapped_column(JSON)
    order: Mapped["Order"] = relationship(back_populates="items")


class OrderEvent(Base):
    """Status history of an order: what it changed to, who did it, when."""
    __tablename__ = "order_events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.reference", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(30))
    actor: Mapped[str] = mapped_column(String(20), default="system")  # customer | admin | system
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    order: Mapped["Order"] = relationship(back_populates="events")


class StickerSheet(Base):
    """A collection of independent stickers curated by the admin. Customers only see 'published' sheets."""
    __tablename__ = "sticker_sheets"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(12), default="draft", index=True)  # draft | published
    ratio: Mapped[float] = mapped_column(Float, default=1.35)  # sheet height / width
    background: Mapped[str | None] = mapped_column(String(80), nullable=True)  # full-page picture behind the sheet (file in media/sheets/)
    background_opacity: Mapped[float] = mapped_column(Float, default=1.0, server_default="1")  # 0..1, how strongly the picture shows
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stickers: Mapped[list["SheetSticker"]] = relationship(
        back_populates="sheet", cascade="all, delete-orphan", order_by="SheetSticker.z", lazy="selectin"
    )


class SheetSticker(Base):
    """One independent sticker: its own file + its placement on the sheet (all in % of the sheet)."""
    __tablename__ = "sheet_stickers"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    sheet_id: Mapped[str] = mapped_column(ForeignKey("sticker_sheets.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(80))          # file in media/sheets/
    original_name: Mapped[str] = mapped_column(String(200))
    aspect: Mapped[float] = mapped_column(Float)               # height / width
    kept_background: Mapped[bool] = mapped_column(Boolean, default=False)
    x: Mapped[float] = mapped_column(Float, default=50)        # center, % of sheet width
    y: Mapped[float] = mapped_column(Float, default=50)        # center, % of sheet height
    w: Mapped[float] = mapped_column(Float, default=20)        # width, % of sheet width
    rot: Mapped[float] = mapped_column(Float, default=0)       # degrees, clockwise
    z: Mapped[int] = mapped_column(Integer, default=0)         # stacking order
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    sheet: Mapped["StickerSheet"] = relationship(back_populates="stickers")