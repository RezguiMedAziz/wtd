import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from .services.colors import normalize_color


class CamelModel(BaseModel):
    """JSON in/out is camelCase (matches the React app); Python code stays snake_case."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------- users
_MOBILE = re.compile(r"^\+?[0-9][0-9\s.\-]{6,16}[0-9]$")
_POSTAL = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s\-]{2,9}$")


class UserIn(CamelModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    mobile: str
    email: EmailStr
    address: str = Field(min_length=5, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    postal_code: str

    @field_validator("first_name", "last_name", "address", "city", "mobile", "postal_code", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        if not _MOBILE.match(v):
            raise ValueError("Invalid mobile number.")
        return v

    @field_validator("postal_code")
    @classmethod
    def _postal(cls, v: str) -> str:
        if not _POSTAL.match(v):
            raise ValueError("Invalid postal code.")
        return v


class UserOut(CamelModel):
    id: str
    first_name: str
    last_name: str
    mobile: str
    email: str
    address: str
    city: str
    postal_code: str


class UserCreated(CamelModel):
    user: UserOut
    token: str


# ---------- catalog
class PhoneOut(CamelModel):
    id: str
    brand: str
    name: str
    camera: str
    ratio: float
    radius: float
    color: str
    custom: bool = False
    needs_verification: bool = False


class CustomPhoneIn(CamelModel):
    name: str = Field(min_length=2, max_length=60)


# ---------- stickers
class StickerOut(CamelModel):
    id: str
    name: str
    src: str
    ar: float
    kept_background: bool = False  # True when the picture was stored with its original background


# ---------- sticker sheets
class SheetStickerOut(CamelModel):
    id: str
    name: str
    src: str
    ar: float                 # height / width
    x: float
    y: float
    w: float
    rot: float
    z: int
    kept_background: bool = False


class SheetOut(CamelModel):
    id: str
    name: str
    description: str
    status: str
    ratio: float
    sticker_count: int
    stickers: list[SheetStickerOut]
    background: str | None = None   # URL of the full-page picture shown behind the sheet (None = plain black)
    background_opacity: float = 1.0  # 0..1, how strongly the background picture shows
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None


class SheetCreate(CamelModel):
    name: str = Field(default="Untitled sheet", min_length=1, max_length=80)


class SheetLayoutItem(CamelModel):
    id: str
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    w: float = Field(ge=2, le=100)
    rot: float = Field(ge=-720, le=720, default=0)
    z: int = Field(ge=0, le=10000, default=0)


class SheetIn(CamelModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=500)
    ratio: float = Field(default=1.35, ge=0.6, le=2.2)
    background_opacity: float = Field(default=1.0, ge=0, le=1)
    layout: list[SheetLayoutItem] = Field(default_factory=list, max_length=200)


# ---------- designs
class PlacedSticker(CamelModel):
    uid: str = Field(min_length=1, max_length=40)
    kind: Literal["builtin", "upload", "sheet"]   # "builtin" is legacy (old saved designs / orders only)
    ref_id: str = Field(min_length=1, max_length=80)
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    w: float = Field(ge=4, le=100)
    rot: float = Field(ge=-720, le=720, default=0)
    ar: float = Field(gt=0, le=20)
    src: str | None = None  # filled by the server for uploaded / sheet stickers
    fill: bool = False  # sticker fitted to the whole case (cover)


class DesignIn(CamelModel):
    name: str = Field(default="My design", min_length=1, max_length=80)
    phone_id: str
    case_type: Literal["transparent", "silicone"]
    color: str | None = None  # any HEX / rgb() color (or a legacy palette id); stored as '#rrggbb'
    session_id: str = Field(default="", max_length=64)
    sheet_id: str | None = Field(default=None, max_length=32)  # sticker sheet picked in the marketplace
    stickers: list[PlacedSticker] = Field(default_factory=list, max_length=80)
    upload_ids: list[str] = Field(default_factory=list, max_length=60)

    @field_validator("color", mode="before")
    @classmethod
    def _color(cls, v):
        return normalize_color(v)


class DesignOut(CamelModel):
    id: str
    name: str
    phone: PhoneOut
    case_type: str
    color: str | None
    session_id: str
    sheet_id: str | None = None
    stickers: list[PlacedSticker]
    uploads: list[StickerOut]
    created_at: datetime
    updated_at: datetime


# ---------- orders
class OrderItemIn(CamelModel):
    design: DesignIn
    design_id: str | None = None
    quantity: int = Field(default=1, ge=1, le=20)


class OrderIn(CamelModel):
    """One order = one or more designs. The old single-design body ({design, designId, quantity}) is still accepted."""
    items: list[OrderItemIn] = Field(min_length=1, max_length=20)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def _legacy_single_design(cls, data):
        if isinstance(data, dict) and "items" not in data and "design" in data:
            data = {
                **data,
                "items": [{
                    "design": data["design"],
                    "designId": data.get("designId", data.get("design_id")),
                    "quantity": data.get("quantity", 1),
                }],
            }
        return data


class OrderItemOut(CamelModel):
    design_id: str | None = None
    quantity: int
    design: dict


class OrderEventOut(CamelModel):
    status: str
    actor: str
    created_at: datetime


class OrderOut(CamelModel):
    reference: str
    status: str
    quantity: int
    notes: str | None = None
    customer: dict
    items: list[OrderItemOut]
    created_at: datetime
    total: float = 0
    currency: str = "€"
    can_cancel: bool = False
    history: list[OrderEventOut] = Field(default_factory=list)


class StatusIn(CamelModel):
    status: Literal["confirmed", "preparing", "prepared", "shipped", "delivered"]