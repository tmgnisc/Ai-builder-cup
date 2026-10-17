import time
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import Settings, get_settings
from ...core.database import get_db
from ...core.errors import CommerceException
from ...domain.catalog import search_products
from ...domain.chaos import resolve_chaos, roll_failure, simulate_latency
from ...domain.models import Category, Product, ProductQuery, ProductSearchResult, ProductSpecs, Sort
from ...models.db import ProductDB
from ...repositories.postgres_catalog import row_to_product
from ...services.catalog import CatalogService
from ..dependencies import get_catalog_service, verify_shared_secret

router = APIRouter()


class ProductDetailResponse(BaseModel):
    product: Product


class CreateProductInput(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=255)
    brand: str = Field(min_length=2, max_length=100)
    category: Category
    price: int = Field(gt=0)
    stock: int = Field(ge=0, default=0)
    rating: float = Field(ge=0.0, le=5.0, default=4.5)
    reviewCount: int = Field(ge=0, default=0)
    blurb: str = Field(default="")
    tags: list[str] = Field(default_factory=list)
    specs: ProductSpecs
    palette: tuple[str, str] = Field(default=("#181716", "#FBFBFA"))


class UpdateProductInput(BaseModel):
    name: str | None = None
    brand: str | None = None
    category: Category | None = None
    price: int | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    rating: float | None = Field(default=None, ge=0.0, le=5.0)
    blurb: str | None = None
    tags: list[str] | None = None
    specs: dict | None = None


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
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
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

    # Live query from PostgreSQL if database session is active
    if session is not None:
        stmt = select(ProductDB).order_by(ProductDB.category, ProductDB.name)
        result_rows = (await session.execute(stmt)).scalars().all()
        if result_rows:
            live_products = [row_to_product(r) for r in result_rows]
            result = search_products(query, live_products)
            took_ms = round((time.perf_counter() - started) * 1000)
            return ProductSearchResult(
                products=result.products,
                total=result.total,
                tookMs=took_ms,
            )

    # Fallback to catalog service in-memory
    result = catalog_service.search(query)
    took_ms = round((time.perf_counter() - started) * 1000)
    return ProductSearchResult(
        products=result.products,
        total=result.total,
        tookMs=took_ms,
    )


@router.get("/meta/categories")
async def get_categories_endpoint(
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
):
    """Returns dynamic categories and available product counts from PostgreSQL."""
    if session is not None:
        stmt = select(ProductDB.category, func.count(ProductDB.id)).group_by(ProductDB.category)
        res = (await session.execute(stmt)).all()
        return [{"id": cat, "label": cat.capitalize(), "count": count} for cat, count in res]

    products = catalog_service.get_all() if catalog_service else []
    counts: dict[str, int] = {}
    for p in products:
        counts[p.category] = counts.get(p.category, 0) + 1
    return [{"id": cat, "label": cat.capitalize(), "count": count} for cat, count in counts.items()]


@router.get("/meta/brands")
async def get_brands_endpoint(
    category: str | None = None,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
):
    """Returns distinct brands from PostgreSQL with optional category filtering."""
    if session is not None:
        stmt = select(ProductDB.brand).distinct()
        if category:
            stmt = stmt.where(ProductDB.category == category)
        res = (await session.execute(stmt)).scalars().all()
        return sorted(list(res))

    products = catalog_service.get_all() if catalog_service else []
    if category:
        products = [p for p in products if p.category == category]
    return sorted(list({p.brand for p in products}))


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product_endpoint(
    product_id: str,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
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

    # Live query from PostgreSQL if database session is active
    if session is not None:
        stmt = select(ProductDB).where(ProductDB.id == product_id)
        row = (await session.execute(stmt)).scalar_one_or_none()
        if row is not None:
            return ProductDetailResponse(product=row_to_product(row))

    product = catalog_service.get_product(product_id)
    if not product:
        raise CommerceException("NOT_FOUND", f'No product with id "{product_id}".')

    return ProductDetailResponse(product=product)


@router.post("", response_model=ProductDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_product_endpoint(
    payload: CreateProductInput,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> ProductDetailResponse:
    """Adds a new product to PostgreSQL database."""
    if session is None:
        raise CommerceException("DATABASE_UNAVAILABLE", "PostgreSQL database is required to create products.")

    existing = (await session.execute(select(ProductDB).where(ProductDB.id == payload.id))).scalar_one_or_none()
    if existing:
        raise CommerceException("CONFLICT", f"Product with ID '{payload.id}' already exists.")

    new_prod = ProductDB(
        id=payload.id,
        name=payload.name,
        brand=payload.brand,
        category=payload.category,
        price=payload.price,
        stock=payload.stock,
        rating=payload.rating,
        review_count=payload.reviewCount,
        blurb=payload.blurb,
        tags=payload.tags,
        specs=payload.specs.model_dump(),
        palette=list(payload.palette),
    )
    session.add(new_prod)
    await session.commit()
    await session.refresh(new_prod)
    return ProductDetailResponse(product=row_to_product(new_prod))


@router.patch("/{product_id}", response_model=ProductDetailResponse)
async def update_product_endpoint(
    product_id: str,
    payload: UpdateProductInput,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> ProductDetailResponse:
    """Updates product attributes directly in PostgreSQL."""
    if session is None:
        raise CommerceException("DATABASE_UNAVAILABLE", "PostgreSQL database is required.")

    row = (await session.execute(select(ProductDB).where(ProductDB.id == product_id))).scalar_one_or_none()
    if not row:
        raise CommerceException("NOT_FOUND", f"Product '{product_id}' not found.")

    updates = payload.model_dump(exclude_unset=True)
    for field, val in updates.items():
        if field == "specs" and isinstance(val, dict):
            current_specs = dict(row.specs or {})
            current_specs.update(val)
            row.specs = current_specs
        elif hasattr(row, field):
            setattr(row, field, val)

    await session.commit()
    await session.refresh(row)
    return ProductDetailResponse(product=row_to_product(row))


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
async def delete_product_endpoint(
    product_id: str,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
):
    """Deletes a product from PostgreSQL."""
    if session is None:
        raise CommerceException("DATABASE_UNAVAILABLE", "PostgreSQL database is required.")

    res = await session.execute(delete(ProductDB).where(ProductDB.id == product_id))
    await session.commit()
    if res.rowcount == 0:
        raise CommerceException("NOT_FOUND", f"Product '{product_id}' not found.")
    return {"productId": product_id, "deleted": True}
