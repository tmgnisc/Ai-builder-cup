import time
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel

from ...core.config import Settings, get_settings
from ...core.errors import CommerceException
from ...domain.chaos import resolve_chaos, roll_failure, simulate_latency
from ...domain.models import Category, Product, ProductQuery, ProductSearchResult, Sort
from ...services.catalog import CatalogService
from ..dependencies import get_catalog_service, verify_shared_secret

router = APIRouter()


class ProductDetailResponse(BaseModel):
    product: Product


def _parse_list_param(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    result: list[str] = []
    for item in values:
        for part in item.split(","):
            cleaned = part.strip()
            if cleaned:
                result.append(cleaned)
    return result if result else None


@router.get("", response_model=ProductSearchResult)
async def search_products_endpoint(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    q: str | None = None,
    category: Category | None = None,
    brand: Annotated[list[str] | None, Query()] = None,
    tag: Annotated[list[str] | None, Query()] = None,
    minPrice: float | None = None,
    maxPrice: float | None = None,
    minRam: float | None = None,
    minBattery: float | None = None,
    maxWeight: float | None = None,
    inStock: str | None = None,
    sort: Sort | None = None,
    limit: int | None = None,
    chaos: float | None = None,
    latency: int | None = None,
    x_persona_chaos: Annotated[str | None, Header()] = None,
    x_persona_latency: Annotated[str | None, Header()] = None,
) -> ProductSearchResult:
    started = time.perf_counter()

    in_stock_only: bool | None = None
    if inStock is not None:
        in_stock_only = inStock != "0"

    try:
        query = ProductQuery(
            q=q,
            category=category,
            brands=_parse_list_param(brand),
            tags=_parse_list_param(tag),
            minPrice=minPrice,
            maxPrice=maxPrice,
            minRamGB=minRam,
            minBatteryHours=minBattery,
            maxWeightGrams=maxWeight,
            inStockOnly=in_stock_only,
            sort=sort,
            limit=limit,
        )
    except Exception as exc:
        raise CommerceException("INVALID_INPUT", str(exc)) from exc

    chaos_cfg = resolve_chaos(
        chaos_param=chaos,
        latency_param=latency,
        chaos_header=x_persona_chaos,
        latency_header=x_persona_latency,
        env_rate=settings.persona_failure_rate,
        env_min=settings.persona_latency_min_ms,
        env_max=settings.persona_latency_max_ms,
    )

    await simulate_latency(chaos_cfg)
    if roll_failure(chaos_cfg, mutation=False):
        raise CommerceException("TRANSIENT", "The store service hiccuped. Please try again.")

    result = catalog_service.search(query)
    took_ms = round((time.perf_counter() - started) * 1000)
    return ProductSearchResult(
        products=result.products,
        total=result.total,
        tookMs=took_ms,
    )


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product_endpoint(
    product_id: str,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    chaos: float | None = None,
    latency: int | None = None,
    x_persona_chaos: Annotated[str | None, Header()] = None,
    x_persona_latency: Annotated[str | None, Header()] = None,
) -> ProductDetailResponse:
    chaos_cfg = resolve_chaos(
        chaos_param=chaos,
        latency_param=latency,
        chaos_header=x_persona_chaos,
        latency_header=x_persona_latency,
        env_rate=settings.persona_failure_rate,
        env_min=settings.persona_latency_min_ms,
        env_max=settings.persona_latency_max_ms,
    )

    await simulate_latency(chaos_cfg)
    if roll_failure(chaos_cfg, mutation=False):
        raise CommerceException("TRANSIENT", "The store service hiccuped. Please try again.")

    product = catalog_service.get_product(product_id)
    if not product:
        raise CommerceException("NOT_FOUND", f'No product with id "{product_id}".')

    return ProductDetailResponse(product=product)
