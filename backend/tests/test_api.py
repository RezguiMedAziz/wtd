import io

from .conftest import USER, png_bytes


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_onboarding_validation(client):
    assert client.post("/api/users", json={**USER, "email": "nope"}).status_code == 422
    assert client.post("/api/users", json={**USER, "mobile": "abc"}).status_code == 422
    assert client.post("/api/users", json={**USER, "postalCode": "!"}).status_code == 422
    r = client.post("/api/users", json=USER)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["firstName"] == "Sarra" and len(body["token"]) > 20
    me = client.get("/api/users/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.json()["email"] == "sarra@example.com"


def test_auth_required(client):
    assert client.get("/api/designs").status_code == 401
    assert client.get("/api/designs", headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_phone_search_and_brands(client):
    assert {p["brand"] for p in client.get("/api/phones", params={"q": "samsung s25"}).json()} == {"Samsung"}
    names = [p["name"] for p in client.get("/api/phones", params={"q": "iphone 15"}).json()]
    assert "iPhone 15 Pro" in names
    assert client.get("/api/phones", params={"q": "zzzz"}).json() == []
    assert client.get("/api/phones", params={"brand": "Xiaomi"}).json()
    assert client.get("/api/phones/brands").json()[:3] == ["Apple", "Samsung", "Xiaomi"]
    p = client.get("/api/phones", params={"q": "iPhone 15 Pro"}).json()[0]
    assert {"id", "brand", "name", "camera", "ratio", "radius", "color", "needsVerification"} <= set(p)


def test_custom_phone_flagged_and_private(client, auth):
    r = client.post("/api/phones/custom", json={"name": "Nokia  G42"}, headers=auth)
    assert r.status_code == 201 and r.json()["needsVerification"] is True and r.json()["name"] == "Nokia G42"
    assert client.get("/api/phones", params={"q": "nokia"}).json() == []            # anonymous: hidden
    assert len(client.get("/api/phones", params={"q": "nokia"}, headers=auth).json()) == 1  # owner: visible
    other = client.post("/api/users", json=USER).json()["token"]
    assert client.post("/api/phones/custom", json={"name": "Nokia G42"}, headers={"Authorization": f"Bearer {other}"}).status_code == 409


def test_case_config(client):
    cfg = client.get("/api/cases/config").json()
    assert [t["id"] for t in cfg["types"]] == ["transparent", "silicone"] and len(cfg["siliconeColors"]) >= 6


def test_sticker_upload_flow_and_limit(client, auth, fake_engine):
    sid = "session-limit"
    r = client.post("/api/stickers/remove-background", headers=auth, data={"session_id": sid},
                    files={"file": ("me.png", png_bytes(), "image/png")})
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["src"].startswith("http://testserver/media/stickers/") and s["ar"] > 0
    assert client.get(s["src"].replace("http://testserver", "")).status_code == 200  # file is served
    for _ in range(14):
        assert client.post("/api/stickers/remove-background", headers=auth, data={"session_id": sid},
                           files={"file": ("a.png", png_bytes(), "image/png")}).status_code == 201
    over = client.post("/api/stickers/remove-background", headers=auth, data={"session_id": sid},
                       files={"file": ("a.png", png_bytes(), "image/png")})
    assert over.status_code == 409 and "limit" in over.json()["detail"].lower()
    assert len(client.get("/api/stickers", params={"session_id": sid}, headers=auth).json()) == 15
    # another session starts fresh
    assert client.post("/api/stickers/remove-background", headers=auth, data={"session_id": "other"},
                       files={"file": ("a.png", png_bytes(), "image/png")}).status_code == 201
    assert client.delete(f"/api/stickers/{s['id']}", headers=auth).status_code == 204
    assert client.get(s["src"].replace("http://testserver", "")).status_code == 404


def test_sticker_upload_rejects_bad_files(client, auth, fake_engine):
    def up(name, data, ctype="image/png"):
        return client.post("/api/stickers/remove-background", headers=auth, data={"session_id": "bad"}, files={"file": (name, data, ctype)})
    assert up("x.png", b"").status_code == 422
    assert up("x.png", b"this is not an image").status_code == 422
    assert up("x.png", b"GIF89a" + b"0" * 50, "image/gif").status_code == 422
    big = b"\x89PNG" + b"0" * (13 * 1024 * 1024)
    assert up("big.png", big).status_code == 413
    assert client.post("/api/stickers/remove-background", data={"session_id": "x"}, files={"file": ("a.png", png_bytes(), "image/png")}).status_code == 401


def test_engine_unavailable_returns_503(client, auth, monkeypatch):
    from app.services import background_removal as br
    def boom(_): raise br.BackgroundRemovalUnavailable("Background-removal engine could not start.")
    monkeypatch.setattr(br, "remove_background", boom)
    r = client.post("/api/stickers/remove-background", headers=auth, data={"session_id": "s503"}, files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 503 and "engine" in r.json()["detail"].lower()


def _design(phone_id, upload_id=None, **over):
    stickers = [{"uid": "s1", "kind": "builtin", "refId": "heart-pink", "x": 30, "y": 40, "w": 20, "rot": 15, "ar": 0.9}]
    if upload_id:
        stickers.append({"uid": "s2", "kind": "upload", "refId": upload_id, "x": 60, "y": 70, "w": 25, "rot": -30, "ar": 1.2})
    return {"name": "My duck case", "phoneId": phone_id, "caseType": "silicone", "color": "blue", "sessionId": "ds",
            "stickers": stickers, "uploadIds": [upload_id] if upload_id else [], **over}


def test_design_save_reopen_update_delete(client, auth, fake_engine):
    phone = client.get("/api/phones", params={"q": "iphone 15 pro"}).json()[0]
    up = client.post("/api/stickers/remove-background", headers=auth, data={"session_id": "ds"}, files={"file": ("me.png", png_bytes(), "image/png")}).json()
    r = client.post("/api/designs", json=_design(phone["id"], up["id"]), headers=auth)
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["phone"]["name"] == "iPhone 15 Pro" and d["color"] == "blue" and d["caseType"] == "silicone"
    assert d["stickers"][0]["src"] is None and d["stickers"][1]["src"] == up["src"]
    assert (d["stickers"][1]["x"], d["stickers"][1]["w"], d["stickers"][1]["rot"]) == (60, 25, -30)
    assert d["uploads"][0]["id"] == up["id"]
    assert client.get(f"/api/designs/{d['id']}", headers=auth).json()["name"] == "My duck case"
    upd = client.put(f"/api/designs/{d['id']}", json=_design(phone["id"], up["id"], name="Renamed", caseType="transparent"), headers=auth).json()
    assert upd["name"] == "Renamed" and upd["color"] is None
    assert [x["id"] for x in client.get("/api/designs", headers=auth).json()] == [d["id"]]
    assert client.delete(f"/api/designs/{d['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/designs/{d['id']}", headers=auth).status_code == 404


def test_design_validation_and_isolation(client, auth):
    phone = client.get("/api/phones", params={"q": "iphone 15"}).json()[0]
    assert client.post("/api/designs", json=_design("nope"), headers=auth).status_code == 422
    assert client.post("/api/designs", json=_design(phone["id"], color="neon"), headers=auth).status_code == 422
    assert client.post("/api/designs", json=_design(phone["id"], upload_id="doesnotexist"), headers=auth).status_code == 422
    bad = _design(phone["id"]); bad["stickers"][0]["x"] = 150
    assert client.post("/api/designs", json=bad, headers=auth).status_code == 422
    d = client.post("/api/designs", json=_design(phone["id"]), headers=auth).json()
    other = {"Authorization": "Bearer " + client.post("/api/users", json=USER).json()["token"]}
    assert client.get(f"/api/designs/{d['id']}", headers=other).status_code == 404
    assert client.delete(f"/api/designs/{d['id']}", headers=other).status_code == 404


def test_order_mock_flow(client, auth):
    phone = client.get("/api/phones", params={"q": "galaxy s25 ultra"}).json()[0]
    r = client.post("/api/orders", json={"design": _design(phone["id"]), "quantity": 2}, headers=auth)
    assert r.status_code == 201, r.text
    o = r.json()
    assert o["reference"].startswith("WTD-") and o["status"] == "confirmed" and o["quantity"] == 2
    assert o["customer"]["email"] == "sarra@example.com" and o["design"]["phone"]["name"] == "Galaxy S25 Ultra"
    assert client.get(f"/api/orders/{o['reference']}", headers=auth).json()["reference"] == o["reference"]
    assert len(client.get("/api/orders", headers=auth).json()) == 1
    assert client.post("/api/orders", json={"design": _design("nope")}, headers=auth).status_code == 422
    assert client.get("/api/orders").status_code == 401
