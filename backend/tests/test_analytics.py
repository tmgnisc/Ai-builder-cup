from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_analytics_repository, get_catalog_service
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.main import create_app
from app.services.analytics import AnalyticsEvent, InMemoryAnalyticsRepository, aggregate, sanitize_data
from app.services.catalog import CatalogService

NOW = datetime(2026, 10, 18, 12, tzinfo=timezone.utc)


def ev(sid: str, kind: str, hours_ago: float, **data: object) -> AnalyticsEvent:
    return AnalyticsEvent(session_id=sid, kind=kind, data=dict(data), created_at=NOW - timedelta(hours=hours_ago))


def test_empty_store_reports_zeros_not_demo_numbers() -> None:
    stats = aggregate([], NOW)
    assert all(k["value"] == 0 for k in stats["kpis"])
    assert [s["value"] for s in stats["funnel"]] == [0] * 6
    assert stats["topQuestions"] == stats["frictionThemes"] == stats["missingInfo"] == []


def test_kpis_funnel_and_completion() -> None:
    events = [
        ev("s1", "visit", 30),
        ev("s1", "pip_message", 29, text="Laptop under 1 lakh?", intent="search"),
        ev("s1", "recommendation", 29, productIds=["acer-swift-go-14"]),
        ev("s1", "cart_verified", 28, productId="acer-swift-go-14"),
        ev("s2", "visit", 5),
        ev("s2", "pip_message", 4, text="laptop under 1 lakh", intent="search"),
        ev("s2", "cart_failed", 4, productId="acer-swift-go-14"),
        ev("s3", "visit", 2),
        ev("s3", "tip_shown", 2, topic="price"),
        ev("s3", "tip_engaged", 1, topic="price"),
        # Previous period baseline: one assisted session.
        ev("old", "pip_message", 24 * 9, text="hello"),
        # Outside both windows: ignored.
        ev("ancient", "pip_message", 24 * 30, text="hello"),
    ]
    stats = aggregate(events, NOW)
    kpi = {k["key"]: k for k in stats["kpis"]}
    assert kpi["assisted"]["value"] == 3
    assert kpi["assisted"]["delta"] == 200
    assert kpi["completion"]["value"] == 50.0  # s1 reached a verified add, s2 didn't
    assert kpi["verified"]["value"] == 50.0
    assert kpi["tips"]["value"] == 100.0
    assert len(kpi["assisted"]["trend"]) == 7
    assert kpi["assisted"]["trend"][-1] == 2  # s2 and s3 in the last 24 hours
    assert stats["cartActions"] == {"total": 2, "verified": 1, "caught": 1}
    assert [s["value"] for s in stats["funnel"]] == [3, 2, 1, 0, 1, 0]

    # Same question with different casing/punctuation is grouped; resolution is per session.
    q = stats["topQuestions"][0]
    assert q["count"] == 2 and q["intent"] == "search" and q["resolved"] == 0.5


def test_missing_info_and_friction_grouping() -> None:
    events = [
        ev("a", "missing_info", 3, productId="p1", field="Keyboard backlight", question="Backlit?"),
        ev("b", "missing_info", 2, productId="p1", field="keyboard backlight"),
        ev("c", "missing_info", 1, productId="p2", field="eSIM"),
        ev("a", "friction", 1, text="Delivery cost unclear", page="Checkout"),
        ev("b", "friction", 1, text="delivery cost unclear!", page="Checkout"),
    ]
    stats = aggregate(events, NOW)
    top = stats["missingInfo"][0]
    assert (top["productId"], top["asks"], top["example"]) == ("p1", 2, "Backlit?")
    assert stats["frictionThemes"][0]["count"] == 2


def test_sanitize_drops_blobs() -> None:
    clean = sanitize_data({"text": "x" * 1000, "nested": {"a": 1}, "ids": ["a"] * 50, "n": 3})
    assert len(clean["text"]) == 200 and "nested" not in clean and len(clean["ids"]) == 8 and clean["n"] == 3


@pytest.fixture
def api() -> TestClient:
    settings = Settings(gemini_api_key="", agent_shared_secret="", database_url="")
    repo = InMemoryAnalyticsRepository()
    app = create_app(settings)
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_db] = lambda: None
    app.dependency_overrides[get_analytics_repository] = lambda: repo
    catalog = CatalogService()
    app.dependency_overrides[get_catalog_service] = lambda: catalog
    return TestClient(app)


def test_events_feed_merchant_analytics_behind_login(api: TestClient) -> None:
    sid = "sess_abcdef12"
    assert api.post("/api/events", json={"sessionId": sid, "kind": "visit"}).status_code == 202
    msg = {"sessionId": sid, "kind": "pip_message", "data": {"text": "hi"}}
    assert api.post("/api/events", json=msg).status_code == 202
    assert api.post("/api/events", json={"sessionId": sid, "kind": "nope"}).status_code == 400

    assert api.get("/api/merchant/analytics").status_code == 401
    assert api.get("/api/orders").status_code == 401

    login = api.post("/api/merchant/auth/login", json={"email": "admin@persona.store", "password": "persona2026"})
    assert login.status_code == 200
    stats = api.get("/api/merchant/analytics").json()
    assert stats["funnel"][0]["value"] == 1 and stats["funnel"][1]["value"] == 1

    kpis = api.get("/api/merchant/kpis").json()
    assert kpis["assistedSessions"] == 1 and kpis["totalOrders"] == 0 and len(kpis["revenueTrend"]) == 7


def test_orders_without_database_are_kept_in_memory(api: TestClient) -> None:
    body = {
        "customerName": "Sita Rai",
        "customerEmail": "sita@example.com",
        "city": "Pokhara",
        "items": [{"productId": "acer-swift-go-14", "productName": "Swift Go 14", "quantity": 1, "unitPrice": 100}],
    }
    created = api.post("/api/orders", json=body)
    assert created.status_code == 201
    api.post("/api/merchant/auth/login", json={"email": "admin@persona.store", "password": "persona2026"})
    orders = api.get("/api/orders").json()
    assert orders[0]["id"] == created.json()["id"]
    patched = api.patch(f"/api/orders/{created.json()['id']}/status", json={"status": "dispatched"})
    assert patched.json()["status"] == "dispatched"
    assert api.get("/api/merchant/kpis").json()["revenueTrend"][-1] >= 100
