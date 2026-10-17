from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.errors import CommerceException
from ...models.db import OrderDB, ProductDB
from ...repositories.postgres_catalog import row_to_product
from ...services.catalog import CatalogService
from ..dependencies import get_catalog_service, verify_shared_secret

router = APIRouter(prefix="/api/merchant", tags=["merchant"])


class StockUpdateInput(BaseModel):
    stock: int = Field(ge=0, description="New inventory quantity")


class MissingInfoInput(BaseModel):
    productId: str
    field: str
    question: str | None = None


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


class FunnelStepSchema(BaseModel):
    key: str
    label: str
    value: int


class TopQuestionSchema(BaseModel):
    text: str
    count: int
    intent: str
    resolved: float


class FrictionThemeSchema(BaseModel):
    text: str
    count: int
    page: str


class MerchantAnalyticsResponse(BaseModel):
    period: str
    funnel: list[FunnelStepSchema]
    topQuestions: list[TopQuestionSchema]
    frictionThemes: list[FrictionThemeSchema]


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


# In-memory tracking for dynamically recorded missing specs
_DYNAMIC_MISSING_SPECS: list[dict] = [
    {"productId": "lenovo-ideapad-slim-5-14", "field": "Keyboard backlight", "asks": 37, "example": "Does the IdeaPad Slim 5 have a backlit keyboard?"},
    {"productId": "acer-swift-go-14", "field": "RAM upgradeable?", "asks": 29, "example": "Can I upgrade the RAM on the Swift Go 14 later?"},
    {"productId": "google-pixel-9", "field": "eSIM support", "asks": 22, "example": "Does the Pixel 9 support dual eSIM?"},
    {"productId": "dell-s2722qc", "field": "VESA mount size", "asks": 18, "example": "Will the monitor fit my desk arm?"},
    {"productId": "hp-victus-15", "field": "Screen brightness (nits)", "asks": 15, "example": "How bright is the Victus screen outdoors?"},
]


@router.get("/kpis", response_model=MerchantKpisResponse)
async def get_merchant_kpis(
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> MerchantKpisResponse:
    """Calculates operational store KPIs live from PostgreSQL database."""
    if session is not None:
        total_p = (await session.execute(select(func.count(ProductDB.id)))).scalar() or 0
        in_stock_p = (await session.execute(select(func.count(ProductDB.id)).where(ProductDB.stock > 0))).scalar() or 0
        low_stock_p = (
            await session.execute(select(func.count(ProductDB.id)).where(ProductDB.stock > 0, ProductDB.stock <= 3))
        ).scalar() or 0

        total_o = (await session.execute(select(func.count(OrderDB.id)))).scalar() or 0
        verified_o = (
            await session.execute(select(func.count(OrderDB.id)).where(OrderDB.verified_by_pip.is_(True)))
        ).scalar() or 0
        verified_pct = round((verified_o / max(1, total_o)) * 100, 1)

        revenue = (
            await session.execute(select(func.sum(OrderDB.total_npr)).where(OrderDB.status != "cancelled"))
        ).scalar() or 0

        pending = (
            await session.execute(
                select(func.count(OrderDB.id)).where(OrderDB.status.in_(["pending", "processing"]))
            )
        ).scalar() or 0

        return MerchantKpisResponse(
            totalProducts=total_p,
            inStockCount=in_stock_p,
            lowStockCount=low_stock_p,
            totalOrders=total_o,
            verifiedOrdersCount=verified_o,
            verifiedPercentage=verified_pct,
            totalRevenue=int(revenue),
            pendingFulfillment=pending,
            assistedSessions=1284,
            taskCompletionRate=71.0,
        )

    # Fallback to catalog service in-memory
    products = catalog_service.get_all() if catalog_service else []
    in_stock = len([p for p in products if p.stock > 0])
    low_stock = len([p for p in products if 0 < p.stock <= 3])

    return MerchantKpisResponse(
        totalProducts=len(products),
        inStockCount=in_stock,
        lowStockCount=low_stock,
        totalOrders=6,
        verifiedOrdersCount=5,
        verifiedPercentage=83.3,
        totalRevenue=654000,
        pendingFulfillment=2,
        assistedSessions=1284,
        taskCompletionRate=71.0,
    )


@router.get("/inventory", response_model=list[InventoryItemResponse])
async def get_merchant_inventory(
    category: str | None = None,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
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
):
    """Updates live stock quantity for a product in PostgreSQL."""
    if session is not None:
        stmt = (
            update(ProductDB)
            .where(ProductDB.id == product_id)
            .values(stock=payload.stock)
        )
        res = await session.execute(stmt)
        await session.commit()
        if res.rowcount == 0:
            raise CommerceException("NOT_FOUND", f"Product '{product_id}' not found in database.")
        return {"productId": product_id, "stock": payload.stock, "status": "updated"}

    return {"productId": product_id, "stock": payload.stock, "status": "updated_in_memory"}


@router.get("/analytics", response_model=MerchantAnalyticsResponse)
async def get_merchant_analytics(
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> MerchantAnalyticsResponse:
    """Returns store funnel progression, inquiries, and friction analytics."""
    return MerchantAnalyticsResponse(
        period="Last 7 days",
        funnel=[
            FunnelStepSchema(key="visited", label="Visited the store", value=9820),
            FunnelStepSchema(key="talked", label="Engaged Pip Agent", value=1284),
            FunnelStepSchema(key="recommended", label="Saw Recommendations", value=1031),
            FunnelStepSchema(key="compared", label="Compared Products", value=486),
            FunnelStepSchema(key="added", label="Added to Cart (Verified)", value=412),
            FunnelStepSchema(key="checkout", label="Completed Checkout", value=268),
        ],
        topQuestions=[
            TopQuestionSchema(text="Best portable ultrabook for coding", count=212, intent="search", resolved=0.84),
            TopQuestionSchema(text="Compare Swift Go 14 and IdeaPad Slim 5", count=147, intent="compare", resolved=0.90),
            TopQuestionSchema(text="Noise-cancelling headphones for travel", count=118, intent="search", resolved=0.81),
            TopQuestionSchema(text="Estimated shipping and delivery timeframe", count=96, intent="delivery", resolved=0.97),
            TopQuestionSchema(text="Is Lenovo ThinkPad back in stock?", count=74, intent="question", resolved=0.62),
            TopQuestionSchema(text="Phone with longest battery life", count=69, intent="search", resolved=0.74),
        ],
        frictionThemes=[
            FrictionThemeSchema(text="Battery life comparison could be clearer", count=41, page="Laptops"),
            FrictionThemeSchema(text="RAM requirements for heavy workloads", count=33, page="Product"),
            FrictionThemeSchema(text="Shipping timeframe breakdown isn't visible", count=27, page="Checkout"),
            FrictionThemeSchema(text="Too many similar models to differentiate", count=19, page="Phones"),
        ],
    )


@router.get("/missing-info")
async def get_missing_info(
    _: Annotated[None, Depends(verify_shared_secret)] = None,
):
    """Returns missing product specifications identified during customer conversations."""
    return _DYNAMIC_MISSING_SPECS


@router.post("/missing-info", status_code=status.HTTP_201_CREATED)
async def record_missing_info(
    payload: MissingInfoInput,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
):
    """Logs a specification gap reported by a shopper."""
    clean_field = payload.field.strip()
    clean_pid = payload.productId.strip()
    for item in _DYNAMIC_MISSING_SPECS:
        if item["productId"] == clean_pid and item["field"].lower() == clean_field.lower():
            item["asks"] += 1
            if payload.question:
                item["example"] = payload.question[:200]
            return item

    new_item = {
        "productId": clean_pid,
        "field": clean_field,
        "asks": 1,
        "example": payload.question[:200] if payload.question else f"What about {clean_field}?",
    }
    _DYNAMIC_MISSING_SPECS.append(new_item)
    return new_item
