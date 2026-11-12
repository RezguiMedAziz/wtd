"""Sticker-sheet helpers: image processing, file locations/URLs, immutable copies for orders."""
import io
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from PIL import Image

from ..config import get_settings
from ..models import SheetSticker, StickerSheet
from ..schemas import SheetOut, SheetStickerOut
from . import background_removal as br
from .image_utils import InvalidImage, open_image, shrink, to_png
from .order_flow import utc

SHEET_DIR = "sheets"          # live files of the sheets (editable by the admin)
ORDER_DIR = "order_assets"    # frozen copies used by submitted orders (never edited, never deleted by sheet changes)
REMOVE_SIDE = 1024            # size handed to the segmentation model (also the max side of a cut-out)
KEEP_SIDE = 1600              # max side when the picture is kept as it is


def folder(sub: str) -> Path:
    p = get_settings().media_path / sub
    p.mkdir(parents=True, exist_ok=True)
    return p


def media_url(sub: str, filename: str) -> str:
    return f"{get_settings().public_base_url.rstrip('/')}/media/{sub}/{filename}"


def sticker_url(s: SheetSticker) -> str:
    return media_url(SHEET_DIR, s.filename)


def process_image(data: bytes, remove_bg: bool) -> tuple[bytes, str, float]:
    """Returns (file bytes, extension, aspect height/width).
    Transparent results are stored as lossless PNG (cropped to the visible pixels).
    A fully opaque picture that keeps its background is stored as high-quality WebP."""
    img = open_image(data)  # validates by decoding; RGBA
    if remove_bg:
        session = br._get_session()  # raises BackgroundRemovalUnavailable if the engine cannot start
        try:
            from rembg import remove
            cut = remove(to_png(shrink(img, REMOVE_SIDE)), session=session)
        except Exception as exc:  # noqa: BLE001
            raise br.BackgroundRemovalUnavailable("Background removal failed while processing the picture.") from exc
        out = Image.open(io.BytesIO(cut)).convert("RGBA")
    else:
        out = shrink(img, KEEP_SIDE)

    alpha = out.getchannel("A")
    if alpha.getextrema()[0] < 255:  # has transparency
        bbox = alpha.point(lambda a: 255 if a > 12 else 0).getbbox()
        if not bbox:
            raise InvalidImage("Nothing was left after removing the background.")
        out = out.crop(bbox)
        return to_png(out), "png", out.height / out.width

    buf = io.BytesIO()
    out.convert("RGB").save(buf, "WEBP", quality=95, method=4)
    return buf.getvalue(), "webp", out.height / out.width


def sticker_out(s: SheetSticker) -> SheetStickerOut:
    return SheetStickerOut(
        id=s.id, name=Path(s.original_name).stem or "sticker", src=sticker_url(s), ar=s.aspect,
        x=s.x, y=s.y, w=s.w, rot=s.rot, z=s.z, kept_background=s.kept_background,
    )


def sheet_out(sheet: StickerSheet) -> SheetOut:
    stickers = [sticker_out(s) for s in sorted(sheet.stickers, key=lambda s: s.z)]
    return SheetOut(
        id=sheet.id, name=sheet.name, description=sheet.description or "", status=sheet.status, ratio=sheet.ratio,
        sticker_count=len(stickers), stickers=stickers,
        background=media_url(SHEET_DIR, sheet.background) if sheet.background else None,
        background_opacity=sheet.background_opacity if sheet.background_opacity is not None else 1.0,
        created_at=utc(sheet.created_at),
        updated_at=utc(sheet.updated_at), published_at=utc(sheet.published_at) if sheet.published_at else None,
    )


def freeze_sticker(s: SheetSticker, sheet_name: str, created: list[Path]) -> dict:
    """Copies a sheet sticker into the order-assets folder and returns its snapshot record.
    The copy is what the order points at, so editing/deleting the sheet later can never break the order."""
    src = folder(SHEET_DIR) / s.filename
    if not src.is_file():
        raise HTTPException(422, "A sticker from the selected sticker sheet is no longer available. Please remove it from your design.")
    asset_id = uuid4().hex
    filename = f"{asset_id}{src.suffix.lower()}"
    dest = folder(ORDER_DIR) / filename
    shutil.copyfile(src, dest)
    created.append(dest)
    return {
        "id": asset_id, "sourceId": s.id, "name": s.original_name, "sheetName": sheet_name,
        "filename": filename, "src": media_url(ORDER_DIR, filename), "ar": s.aspect, "keptBackground": s.kept_background,
    }