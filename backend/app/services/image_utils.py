import io

from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}
MAX_SIDE = 6000          # reject absurdly large pictures
WORK_SIDE = 1024         # size handed to the segmentation model
OUTPUT_SIDE = 640        # size of the stored sticker


class InvalidImage(ValueError):
    pass


def open_image(data: bytes) -> Image.Image:
    """Validates by actually decoding the bytes (the declared content-type is not trusted)."""
    try:
        probe = Image.open(io.BytesIO(data))
        fmt = probe.format
        probe.verify()
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
        raise InvalidImage("This file is not a valid image.") from exc
    if fmt not in ALLOWED_FORMATS:
        raise InvalidImage("Only PNG, JPG and WebP pictures are supported.")
    if max(img.size) > MAX_SIDE:
        raise InvalidImage(f"Picture is too large (max {MAX_SIDE}px per side).")
    return ImageOps.exif_transpose(img).convert("RGBA")


def to_png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def shrink(img: Image.Image, side: int) -> Image.Image:
    img = img.copy()
    img.thumbnail((side, side), Image.LANCZOS)
    return img


def trim_and_finish(png_bytes: bytes) -> tuple[bytes, float]:
    """Crop transparent borders, downscale, return (png, height/width)."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    alpha = img.getchannel("A").point(lambda a: 255 if a > 12 else 0)
    bbox = alpha.getbbox()
    if not bbox:
        raise InvalidImage("Nothing was left after removing the background.")
    img = shrink(img.crop(bbox), OUTPUT_SIDE)
    return to_png(img), img.height / img.width


def to_webp(img: Image.Image, quality: int = 88) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=quality, method=4)
    return buf.getvalue()