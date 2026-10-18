from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy.types import JSON

Base = declarative_base()


class ProductDB(Base):
    """PostgreSQL table for Persona products catalog."""

    __tablename__ = "products"

    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    brand = Column(String(100), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    price = Column(Integer, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    rating = Column(Float, nullable=False, default=0.0)
    review_count = Column(Integer, nullable=False, default=0)
    blurb = Column(Text, nullable=False, default="")
    tags = Column(JSON, nullable=False, default=list)
    specs = Column(JSON, nullable=False, default=dict)
    palette = Column(JSON, nullable=False, default=list)
    image = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class CartItemDB(Base):
    """PostgreSQL table for shopper carts and session persistence."""

    __tablename__ = "cart_items"

    session_id = Column(String(100), primary_key=True, index=True)
    product_id = Column(String(100), primary_key=True, index=True)
    qty = Column(Integer, nullable=False, default=1)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class OrderDB(Base):
    """PostgreSQL table for verified customer orders and fulfillment pipeline."""

    __tablename__ = "orders"

    id = Column(String(50), primary_key=True, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    items = Column(JSON, nullable=False, default=list)
    total_npr = Column(Integer, nullable=False)
    verified_by_pip = Column(Boolean, nullable=False, default=True)
    verification_hash = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MerchantUserDB(Base):
    """PostgreSQL table for merchant store administrators and operators."""

    __tablename__ = "merchant_users"

    id = Column(String(50), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="Store Administrator")
    store_name = Column(String(100), nullable=False, default="Persona Flagship Operations")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime(timezone=True), nullable=True)


class AnalyticsEventDB(Base):
    """PostgreSQL table for shopper telemetry the merchant dashboard is computed from."""

    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), nullable=False, index=True)
    kind = Column(String(32), nullable=False, index=True)
    data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, index=True, default=lambda: datetime.now(timezone.utc))
