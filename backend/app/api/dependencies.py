import hmac
from typing import Annotated

from fastapi import Depends, Header

from ..core.config import Settings, get_settings
from ..core.database import get_session_factory
from ..core.errors import CommerceException
from ..repositories.cart import CartRepository, InMemoryCartRepository
from ..repositories.postgres_cart import PostgresCartRepository
from ..services.analytics import AnalyticsRepository, InMemoryAnalyticsRepository, PostgresAnalyticsRepository
from ..services.cart import CartService
from ..services.catalog import CatalogService
from ..services.verified_cart import VerifiedCartService

_cart_repo_instance = InMemoryCartRepository()
_postgres_cart_repo: CartRepository | None = None
_catalog_service_instance = CatalogService()
_analytics_memory = InMemoryAnalyticsRepository()
_postgres_analytics: AnalyticsRepository | None = None


def get_cart_repository() -> CartRepository:
    """Dependency provider for CartRepository; uses PostgreSQL with in-memory fallback."""
    global _postgres_cart_repo
    factory = get_session_factory()
    if factory is not None:
        if _postgres_cart_repo is None:
            _postgres_cart_repo = PostgresCartRepository(factory, _cart_repo_instance)
        return _postgres_cart_repo
    return _cart_repo_instance


def get_analytics_repository() -> AnalyticsRepository:
    """Shopper telemetry store: PostgreSQL when configured, otherwise process memory."""
    global _postgres_analytics
    factory = get_session_factory()
    if factory is not None:
        if _postgres_analytics is None:
            _postgres_analytics = PostgresAnalyticsRepository(factory)
        return _postgres_analytics
    return _analytics_memory


def get_catalog_service() -> CatalogService:
    """Dependency provider for CatalogService."""
    return _catalog_service_instance


def get_cart_service(
    repo: Annotated[CartRepository, Depends(get_cart_repository)],
    catalog: Annotated[CatalogService, Depends(get_catalog_service)],
) -> CartService:
    return CartService(repository=repo, catalog=catalog)


def get_verified_cart_service(
    repo: Annotated[CartRepository, Depends(get_cart_repository)],
    catalog: Annotated[CatalogService, Depends(get_catalog_service)],
) -> VerifiedCartService:
    return VerifiedCartService(repository=repo, catalog=catalog)


def verify_shared_secret(
    settings: Annotated[Settings, Depends(get_settings)],
    x_agent_shared_secret: Annotated[str | None, Header()] = None,
) -> None:
    """Enforces shared secret between Next.js proxy and backend when configured."""
    if settings.agent_shared_secret:
        if not x_agent_shared_secret or not hmac.compare_digest(x_agent_shared_secret, settings.agent_shared_secret):
            raise CommerceException("UNAUTHORIZED", "Invalid or missing shared secret.")
