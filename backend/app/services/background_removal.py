"""Background removal. Isolated behind remove_background() so the engine can be swapped
(another model, a GPU worker, a third-party API) without touching the routers."""
import io
import threading

from ..config import get_settings
from .image_utils import open_image, shrink, to_png, trim_and_finish


class BackgroundRemovalUnavailable(RuntimeError):
    pass


_lock = threading.Lock()
_session = None


def _get_session():
    global _session
    if _session is None:
        with _lock:
            if _session is None:
                try:
                    from rembg import new_session  # imported lazily: heavy + optional at import time
                    _session = new_session(get_settings().rembg_model)  # downloads the model on first use
                except Exception as exc:  # noqa: BLE001
                    raise BackgroundRemovalUnavailable(
                        f"Background-removal engine could not start ({type(exc).__name__}). "
                        "Check that 'rembg' and 'onnxruntime' are installed and that the model could be downloaded."
                    ) from exc
    return _session


def remove_background(data: bytes) -> tuple[bytes, float]:
    """Takes raw image bytes, returns (transparent PNG bytes, aspect ratio height/width)."""
    img = shrink(open_image(data), 1024)
    session = _get_session()
    try:
        from rembg import remove
        cut = remove(to_png(img), session=session)
    except Exception as exc:  # noqa: BLE001
        raise BackgroundRemovalUnavailable("Background removal failed while processing the picture.") from exc
    return trim_and_finish(cut)


FULL_SIDE = 1600  # longest side kept for full-case artwork


def keep_picture(data: bytes) -> tuple[bytes, float]:
    """Keep-background path: the segmentation model is never involved here.
    The picture is only resized (never cropped/trimmed) and re-encoded as WebP, so every pixel of the
    background survives. Pictures with transparency are stored losslessly; opaque ones at quality 95.
    Returns (WebP bytes, aspect ratio height/width)."""
    img = shrink(open_image(data), FULL_SIDE)
    has_alpha = img.getchannel("A").getextrema()[0] < 255
    buf = io.BytesIO()
    if has_alpha:
        img.save(buf, "WEBP", lossless=True, method=4)
    else:
        img.convert("RGB").save(buf, "WEBP", quality=95, method=4)
    return buf.getvalue(), img.height / img.width