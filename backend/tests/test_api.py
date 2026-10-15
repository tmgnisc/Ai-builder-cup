def test_healthz(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "gemini": False}


def test_unknown_product_is_json_404(client):
    res = client.get("/api/products/nope")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "http_404"


def test_cart_add_then_get(client):
    client.cookies.set("persona_sid", "test-session")
    assert client.post("/api/cart", json={"productId": "p1", "qty": 2}).status_code == 201
    assert client.get("/api/cart").json()["lines"] == [{"productId": "p1", "qty": 2}]


def test_cart_rejects_bad_qty(client):
    client.cookies.set("persona_sid", "test-session")
    res = client.post("/api/cart", json={"productId": "p1", "qty": 0})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_error"


def test_cart_needs_session_cookie(client):
    assert client.get("/api/cart").status_code == 400


def test_agent_without_key_is_503(client):
    res = client.post("/api/agent", json={"message": "hi"})
    assert res.status_code == 503
