from fastapi.testclient import TestClient


def test_healthz_and_readyz(client: TestClient) -> None:
    res_h = client.get("/healthz")
    assert res_h.status_code == 200
    assert res_h.json() == {"status": "ok", "gemini": False}

    res_r = client.get("/readyz")
    assert res_r.status_code == 200
    assert res_r.json() == {"status": "ok", "catalog_loaded": True}


def test_products_search_and_filters(client: TestClient) -> None:
    res = client.get("/api/products?category=laptops&minRam=16&minBattery=8&maxPrice=120000")
    assert res.status_code == 200
    data = res.json()
    assert "products" in data
    assert "total" in data
    assert "tookMs" in data
    assert data["total"] == 3

    res_text = client.get("/api/products?q=docker")
    assert res_text.status_code == 200
    assert res_text.json()["total"] > 0


def test_product_detail_and_not_found(client: TestClient) -> None:
    res_ok = client.get("/api/products/acer-swift-go-14")
    assert res_ok.status_code == 200
    assert res_ok.json()["product"]["id"] == "acer-swift-go-14"

    res_404 = client.get("/api/products/unknown-product-xyz")
    assert res_404.status_code == 404
    err = res_404.json()["error"]
    assert err["code"] == "NOT_FOUND"
    assert "No product with id" in err["message"]


def test_cart_endpoints_lifecycle(client: TestClient) -> None:
    sid = "api-session-test"
    client.cookies.set("persona_sid", sid)

    res_empty = client.get("/api/cart")
    assert res_empty.status_code == 200
    assert res_empty.json()["cart"]["itemCount"] == 0

    res_add = client.post("/api/cart", json={"productId": "acer-swift-go-14", "qty": 2})
    assert res_add.status_code == 200
    cart = res_add.json()["cart"]
    assert cart["itemCount"] == 2
    assert cart["lines"][0]["productId"] == "acer-swift-go-14"

    res_patch = client.patch("/api/cart", json={"productId": "acer-swift-go-14", "qty": 3})
    assert res_patch.status_code == 200
    assert res_patch.json()["cart"]["lines"][0]["qty"] == 3

    res_del_item = client.delete("/api/cart?productId=acer-swift-go-14")
    assert res_del_item.status_code == 200
    assert res_del_item.json()["cart"]["itemCount"] == 0

    client.post("/api/cart", json={"productId": "acer-swift-go-14", "qty": 1})
    res_clear = client.delete("/api/cart")
    assert res_clear.status_code == 200
    assert res_clear.json()["cart"]["itemCount"] == 0


def test_cart_auto_creates_session_cookie(client: TestClient) -> None:
    res = client.get("/api/cart")
    assert res.status_code == 200
    assert "persona_sid" in res.cookies
    assert res.json()["cart"]["itemCount"] == 0


def test_cart_error_responses(client: TestClient) -> None:
    client.cookies.set("persona_sid", "test-errors")

    res_oos = client.post("/api/cart", json={"productId": "lenovo-thinkpad-e14-g6", "qty": 1})
    assert res_oos.status_code == 409
    assert res_oos.json()["error"]["code"] == "OUT_OF_STOCK"

    res_nf = client.post("/api/cart", json={"productId": "nonexistent", "qty": 1})
    assert res_nf.status_code == 404
    assert res_nf.json()["error"]["code"] == "NOT_FOUND"

    res_inv = client.post("/api/cart", json={"productId": "acer-swift-go-14", "qty": 0})
    assert res_inv.status_code == 400
    assert res_inv.json()["error"]["code"] == "INVALID_INPUT"

    res_nic = client.patch("/api/cart", json={"productId": "acer-swift-go-14", "qty": 1})
    assert res_nic.status_code == 404
    assert res_nic.json()["error"]["code"] == "NOT_IN_CART"


def test_chaos_simulation_via_api(client: TestClient) -> None:
    res_chaos = client.get("/api/products?chaos=1.0&latency=0")
    assert res_chaos.status_code == 503
    assert res_chaos.json()["error"]["code"] == "TRANSIENT"


def test_request_id_middleware(client: TestClient) -> None:
    res = client.get("/healthz", headers={"X-Request-ID": "custom-trace-id-123"})
    assert res.status_code == 200
    assert res.headers["x-request-id"] == "custom-trace-id-123"
