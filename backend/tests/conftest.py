import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_cart_repository, get_catalog_service
from app.core.config import Settings, get_settings
from app.main import create_app
from app.repositories.cart import InMemoryCartRepository
from app.services.catalog import CatalogService


@pytest.fixture
def repo() -> InMemoryCartRepository:
    return InMemoryCartRepository()


@pytest.fixture
def catalog_service() -> CatalogService:
    return CatalogService()


@pytest.fixture
def client(repo: InMemoryCartRepository, catalog_service: CatalogService) -> TestClient:
    settings = Settings(
        gemini_api_key="",
        persona_failure_rate=0.0,
        persona_latency_min_ms=0,
        persona_latency_max_ms=0,
    )
    app = create_app(settings)
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_cart_repository] = lambda: repo
    app.dependency_overrides[get_catalog_service] = lambda: catalog_service
    return TestClient(app)
