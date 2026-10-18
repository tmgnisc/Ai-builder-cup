from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.errors import CommerceException
from ...models.db import OrderDB, ProductDB
from ...services.analytics import (
    PERIOD_DAYS,
    AnalyticsEvent,
    AnalyticsRepository,
    aggregate,
    analytics_window_start,
    missing_info,
)
from ...services.catalog import CatalogService
from ..dependencies import get_analytics_repository, get_catalog_service, verify_shared_secret
from .merchant_auth import MerchantUserResponse, get_current_merchant
from .orders import memory_orders

router = APIRouter(prefix="/api/merchant", tags=["merchant"])


class StockUpdateInput(BaseModel):
    stock: int = Field(ge=0, description="New inventory quantity")


class MissingInfoInput(BaseModel):
    productId: str = Field(min_length=1, max_length=100)
    field: str = Field(min_length=1, max_length=100)
    question: str | None = Field(default=None, max_length=500)
    sessionId: str | None = Field(default=None, max_length=64)


class MerchantKpisResponse(BaseModel):
    totalProducts: int
    inStockCount: int
    lowStockCount: int
    totalOrders: int
    verifiedOrdersCount: int
    verifiedPercentage: float
    totalRevenue: int
    pendingFulfillment: int
    assistedSessions: int
    taskCompletionRate: float
    # Last 7 days of orders, oldest day first, plus % change vs the 7 days before.
    revenueTrend: list[int]
    revenueDelta: int
    ordersTrend: list[int]


class InventoryItemResponse(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    price: int
    stock: int
    rating: float
    reviewCount: int
    isLowStock: bool
    isOutOfStock: bool


MerchantAuth = Annotated[MerchantUserResponse, Depends(get_current_merchant)]


def _order_trends(orders: list[tuple[datetime, int, str]], now: datetime) -> tuple[list[int], list[int], int]:
    """Daily revenue and order counts for the last PERIOD_DAYS (oldest first) and revenue % change."""
    revenue = [0] * PERIOD_DAYS
    counts = [0] * PERIOD_DAYS
    prev_revenue = 0
    for created_at, total, status_ in orders:
        if status_ == "cancelled":
            continue
        age_days = int((now - created_at).total_seconds() // 86_400)
        if 0 <= age_days < PERIOD_DAYS:
            revenue[PERIOD_DAYS - 1 - age_days] += total
            counts[PERIOD_DAYS - 1 - age_days] += 1
        elif PERIOD_DAYS <= age_days < PERIOD_DAYS * 2:
            prev_revenue += total
    cur = sum(revenue)
    delta = round((cur - prev_revenue) / prev_revenue * 100) if prev_revenue else 0
    return revenue, counts, delta


@router.get("/kpis", response_model=MerchantKpisResponse)
async def get_merchant_kpis(
    _auth: MerchantAuth,
    repo: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,  # type: ignore[assignment]
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> MerchantKpisResponse:
    """Store KPIs: stock and orders straight from the database, shopper KPIs from telemetry."""
    now = datetime.now(timezone.utc)
    stats = aggregate(await repo.since(analytics_window_start(now)), now)
    kpi = {k["key"]: k for k in stats["kpis"]}

    if session is not None:
        stocks = list((await session.execute(select(ProductDB.stock))).scalars().all())
        rows = (
            await session.execute(
                select(OrderDB.created_at, OrderDB.total_npr, OrderDB.status, OrderDB.verified_by_pip)
            )
        ).all()
        orders = [(r[0] or now, int(r[1]), str(r[2]), bool(r[3])) for r in rows]
    else:
        stocks = [p.stock for p in catalog_service.get_all()]
        orders = [(datetime.fromisoformat(o.createdAt), o.totalNPR, o.status, o.verifiedByPip) for o in memory_orders()]

    verified = sum(1 for o in orders if o[3])
    revenue_trend, orders_trend, revenue_delta = _order_trends([(o[0], o[1], o[2]) for o in orders], now)
    return MerchantKpisResponse(
        totalProducts=len(stocks),
        inStockCount=sum(1 for s in stocks if s > 0),
        lowStockCount=sum(1 for s in stocks if 0 < s <= 3),
        totalOrders=len(orders),
        verifiedOrdersCount=verified,
        verifiedPercentage=round(verified / len(orders) * 100, 1) if orders else 0.0,
        totalRevenue=sum(o[1] for o in orders if o[2] != "cancelled"),
        pendingFulfillment=sum(1 for o in orders if o[2] in ("pending", "processing")),
        assistedSessions=int(kpi["assisted"]["value"]),
        taskCompletionRate=float(kpi["completion"]["value"]),
        revenueTrend=revenue_trend,
        revenueDelta=revenue_delta,
        ordersTrend=orders_trend,
    )


@router.get("/inventory", response_model=list[InventoryItemResponse])
async def get_merchant_inventory(
    category: str | None = None,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    __: Annotated[MerchantUserResponse, Depends(get_current_merchant)] = None,  # type: ignore[assignment]
) -> list[InventoryItemResponse]:
    """Returns inventory status with live stock levels and alerts from PostgreSQL."""
    if session is not None:
        stmt = select(ProductDB).order_by(ProductDB.category, ProductDB.name)
        if category and category != "all":
            stmt = stmt.where(ProductDB.category == category)
        rows = (await session.execute(stmt)).scalars().all()
        return [
            InventoryItemResponse(
                id=r.id,
                name=r.name,
                brand=r.brand,
                category=r.category,
                price=r.price,
                stock=r.stock,
                rating=r.rating,
                reviewCount=r.review_count,
                isLowStock=0 < r.stock <= 3,
                isOutOfStock=r.stock == 0,
            )
            for r in rows
        ]

    products = catalog_service.get_all() if catalog_service else []
    if category and category != "all":
        products = [p for p in products if p.category == category]
    return [
        InventoryItemResponse(
            id=p.id,
            name=p.name,
            brand=p.brand,
            category=p.category,
            price=p.price,
            stock=p.stock,
            rating=p.rating,
            reviewCount=p.reviewCount,
            isLowStock=0 < p.stock <= 3,
            isOutOfStock=p.stock == 0,
        )
        for p in products
    ]


@router.patch("/inventory/{product_id}/stock")
async def update_product_stock_endpoint(
    product_id: str,
    payload: StockUpdateInput,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    __: Annotated[MerchantUserResponse, Depends(get_current_merchant)] = None,  # type: ignore[assignment]
):
    """Updates live stock quantity for a product in PostgreSQL."""
    if session is not None:
        stmt = update(ProductDB).where(ProductDB.id == product_id).values(stock=payload.stock)
        res = await session.execute(stmt)
        await session.commit()
        if res.rowcount == 0:
            raise CommerceException("NOT_FOUND", f"Product '{product_id}' not found in database.")
        return {"productId": product_id, "stock": payload.stock, "status": "updated"}

    return {"productId": product_id, "stock": payload.stock, "status": "updated_in_memory"}


@router.get("/analytics")
async def get_merchant_analytics(
    _auth: MerchantAuth,
    repo: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> dict[str, Any]:
    """Shopper KPIs, assisted funnel, top questions, friction and catalog gaps, computed from telemetry."""
    now = datetime.now(timezone.utc)
    return aggregate(await repo.since(analytics_window_start(now)), now)


@router.get("/missing-info")
async def get_missing_info(
    _auth: MerchantAuth,
    repo: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> list[dict[str, Any]]:
    """Specs shoppers asked Pip for that the catalog doesn't list, most asked first."""
    since = datetime.now(timezone.utc) - timedelta(days=PERIOD_DAYS)
    return missing_info(await repo.since(since))


@router.post("/missing-info", status_code=status.HTTP_201_CREATED)
async def record_missing_info(
    payload: MissingInfoInput,
    repo: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> dict[str, bool]:
    """Logs a specification gap reported during a shopper conversation."""
    await repo.record(
        AnalyticsEvent(
            session_id=payload.sessionId or "server",
            kind="missing_info",
            data={
                "productId": payload.productId.strip(),
                "field": payload.field.strip(),
                "question": (payload.question or "")[:200],
            },
        )
    )
    return {"recorded": True}
