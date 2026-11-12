import io
import os
import tempfile

import pytest
from PIL import Image

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["MEDIA_DIR"] = f"{_tmp}/media"
os.environ["PUBLIC_BASE_URL"] = "http://testserver"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import background_removal  # noqa: E402

USER = {"firstName": "Sarra", "lastName": "Ben Ali", "mobile": "+216 20 123 456", "email": "sarra@example.com",
        "address": "12 Pond Street", "city": "Tunis", "postalCode": "1000"}


def png_bytes(size=(120, 80), color=(255, 120, 190, 255)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", size, color).save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def fake_engine(monkeypatch):
    """Replaces the ML model with a deterministic cutout so API tests are fast and offline."""
    def fake(data: bytes):
        from app.services.image_utils import open_image, to_png, trim_and_finish
        img = open_image(data)
        w, h = img.size
        img.putpixel((0, 0), (0, 0, 0, 0))
        for x in range(w // 4):
            for y in range(h):
                img.putpixel((x, y), (0, 0, 0, 0))  # transparent left quarter, like a removed background
        return trim_and_finish(to_png(img))
    monkeypatch.setattr(background_removal, "remove_background", fake)


@pytest.fixture()
def auth(client):
    r = client.post("/api/users", json=USER)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}
