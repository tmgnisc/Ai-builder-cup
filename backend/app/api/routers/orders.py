import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import Settings, get_settings
from ...core.database import get_db, get_session_factory
from ...core.errors import CommerceException
from ...models.db import OrderDB, ProductDB
from ...services.catalog import CatalogService
from ..dependencies import get_catalog_service, verify_shared_secret

router = APIRouter(prefix="/api/orders", tags=["orders"])


class OrderItemSchema(BaseModel):
    productId: str
    productName: str
    quantity: int = Field(gt=0)
    unitPrice: int = Field(gt=0)


class CreateOrderInput(BaseModel):
    customerName: str = Field(min_length=2, max_length=100)
    customerEmail: str = Field(min_length=5, max_length=150)
    city: str = Field(min_length=2, max_length=100)
    items: list[OrderItemSchema] = Field(min_length=1)
    notes: str | None = None
    verifiedByPip: bool = True
    verificationHash: str | None = None


class UpdateOrderStatusInput(BaseModel):
    status: str = Field(pattern="^(pending|processing|dispatched|delivered|cancelled)$")


class OrderResponse(BaseModel):
    id: str
    customerName: str
    customerEmail: str
    city: str
    items: list[OrderItemSchema]
    totalNPR: int
    verifiedByPip: bool
    verificationHash: str
    status: str
    notes: str | None = None
    createdAt: str


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    status: str | None = None,
    search: str | None = None,
    limit: int = 50,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> list[OrderResponse]:
    """Retrieves customer orders from PostgreSQL database with optional status and search filter."""
    if session is None:
        # Return fallback orders if DB is not active
        from ...data.orders import INITIAL_ORDERS
        filtered = INITIAL_ORDERS
        if status and status != "all":
            filtered = [o for o in filtered if o["status"] == status]
        if search:
            q = search.lower()
            filtered = [
                o for o in filtered
                if q in o["id"].lower() or q in o["customerName"].lower() or q in o["city"].lower()
            ]
        return [
            OrderResponse(
                id=o["id"],
                customerName=o["customerName"],
                customerEmail=o["customerEmail"],
                city=o["city"],
                items=[OrderItemSchema(**it) for it in o["items"]],
                totalNPR=o["totalNPR"],
                verifiedByPip=o.get("verifiedByPip", True),
                verificationHash=o.get("verificationHash", "pip_v_fallback"),
                status=o["status"],
                notes=o.get("notes"),
                createdAt=o.get("date", datetime.now(timezone.utc).isoformat()),
            )
            for o in filtered[:limit]
        ]

    stmt = select(OrderDB).order_by(desc(OrderDB.created_at)).limit(limit)
    if status and status != "all":
        stmt = stmt.where(OrderDB.status == status)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (OrderDB.id.ilike(search_pattern))
            | (OrderDB.customer_name.ilike(search_pattern))
            | (OrderDB.city.ilike(search_pattern))
        )

    result = await session.execute(stmt)
    rows = result.scalars().all()

    return [
        OrderResponse(
            id=r.id,
            customerName=r.customer_name,
            customerEmail=r.customer_email,
            city=r.city,
            items=[OrderItemSchema(**it) for it in (r.items or [])],
            totalNPR=r.total_npr,
            verifiedByPip=r.verified_by_pip,
            verificationHash=r.verification_hash,
            status=r.status,
            notes=r.notes,
            createdAt=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
        )
        for r in rows
    ]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_by_id(
    order_id: str,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> OrderResponse:
    """Fetches full order details by ID."""
    if session is None:
        raise CommerceException("NOT_FOUND", f"Order {order_id} not found.")

    stmt = select(OrderDB).where(OrderDB.id == order_id)
    result = await session.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise CommerceException("NOT_FOUND", f"Order {order_id} not found.")

    return OrderResponse(
        id=order.id,
        customerName=order.customer_name,
        customerEmail=order.customer_email,
        city=order.city,
        items=[OrderItemSchema(**it) for it in (order.items or [])],
        totalNPR=order.total_npr,
        verifiedByPip=order.verified_by_pip,
        verificationHash=order.verification_hash,
        status=order.status,
        notes=order.notes,
        createdAt=order.created_at.isoformat() if order.created_at else "",
    )


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    payload: CreateOrderInput,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
) -> OrderResponse:
    """Creates a new customer order, validates inventory, and records in PostgreSQL."""
    total_npr = 0
    validated_items: list[dict] = []

    for item in payload.items:
        prod = catalog_service.get_product(item.productId)
        if not prod:
            raise CommerceException("NOT_FOUND", f"Product {item.productId} not found in catalog.")
        if prod.stock < item.quantity:
            raise CommerceException(
                "INSUFFICIENT_STOCK",
                f"Insufficient stock for {prod.name}. Available: {prod.stock}, requested: {item.quantity}.",
            )
        total_npr += item.unitPrice * item.quantity
        validated_items.append(item.model_dump())

    order_id = f"ORD-{uuid.uuid4().hex[:6].upper()}"
    v_hash = payload.verificationHash or f"pip_v_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)

    if session is not None:
        new_order = OrderDB(
            id=order_id,
            customer_name=payload.customerName,
            customer_email=payload.customerEmail,
            city=payload.city,
            items=validated_items,
            total_npr=total_npr,
            verified_by_pip=payload.verifiedByPip,
            verification_hash=v_hash,
            status="pending",
            notes=payload.notes,
            created_at=now,
        )
        session.add(new_order)

        # Deduct stock in DB for purchased items
        for item in payload.items:
            await session.execute(
                update(ProductDB)
                .where(ProductDB.id == item.productId)
                .values(stock=ProductDB.stock - item.quantity)
            )

        await session.commit()

    return OrderResponse(
        id=order_id,
        customerName=payload.customerName,
        customerEmail=payload.customerEmail,
        city=payload.city,
        items=payload.items,
        totalNPR=total_npr,
        verifiedByPip=payload.verifiedByPip,
        verificationHash=v_hash,
        status="pending",
        notes=payload.notes,
        createdAt=now.isoformat(),
    )


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    payload: UpdateOrderStatusInput,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> OrderResponse:
    """Updates order fulfillment status (dispatched, delivered, processing)."""
    if session is None:
        raise CommerceException("DATABASE_UNAVAILABLE", "PostgreSQL database is not connected.")

    stmt = select(OrderDB).where(OrderDB.id == order_id)
    result = await session.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise CommerceException("NOT_FOUND", f"Order {order_id} not found.")

    order.status = payload.status
    await session.commit()

    return OrderResponse(
        id=order.id,
        customerName=order.customer_name,
        customerEmail=order.customer_email,
        city=order.city,
        items=[OrderItemSchema(**it) for it in (order.items or [])],
        totalNPR=order.total_npr,
        verifiedByPip=order.verified_by_pip,
        verificationHash=order.verification_hash,
        status=order.status,
        notes=order.notes,
        createdAt=order.created_at.isoformat() if order.created_at else "",
    )


@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    _: Annotated[None, Depends(verify_shared_secret)] = None,
):
    """Deletes or cancels an order from PostgreSQL."""
    if session is None:
        raise CommerceException("DATABASE_UNAVAILABLE", "PostgreSQL database is not connected.")

    stmt = select(OrderDB).where(OrderDB.id == order_id)
    result = await session.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise CommerceException("NOT_FOUND", f"Order {order_id} not found.")

    await session.delete(order)
    await session.commit()
    return {"id": order_id, "deleted": True}
