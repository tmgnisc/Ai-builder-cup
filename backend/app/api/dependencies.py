import hmac
from typing import Annotated

from fastapi import Depends, Header

from ..core.config import Settings, get_settings
from ..core.errors import CommerceException
from ..repositories.cart import CartRepository, InMemoryCartRepository
from ..services.cart import CartService
from ..services.catalog import CatalogService
from ..services.verified_cart import VerifiedCartService

_cart_repo_instance = InMemoryCartRepository()
_catalog_service_instance = CatalogService()


def get_cart_repository() -> CartRepository:
    """Dependency provider for CartRepository; swappable with FirestoreCartRepository."""
    return _cart_repo_instance


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
