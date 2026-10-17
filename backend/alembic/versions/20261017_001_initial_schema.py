"""Initial PostgreSQL schema for products, cart_items, and orders

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-17 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import JSON

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. products table
    op.create_table(
        "products",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("brand", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("blurb", sa.Text(), nullable=False, server_default=""),
        sa.Column("tags", JSON(), nullable=False),
        sa.Column("specs", JSON(), nullable=False),
        sa.Column("palette", JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_products_id"), "products", ["id"], unique=False)
    op.create_index(op.f("ix_products_brand"), "products", ["brand"], unique=False)
    op.create_index(op.f("ix_products_category"), "products", ["category"], unique=False)
    op.create_index(op.f("ix_products_name"), "products", ["name"], unique=False)

    # 2. cart_items table
    op.create_table(
        "cart_items",
        sa.Column("session_id", sa.String(length=100), primary_key=True),
        sa.Column("product_id", sa.String(length=100), primary_key=True),
        sa.Column("qty", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_cart_items_session_id"), "cart_items", ["session_id"], unique=False)
    op.create_index(op.f("ix_cart_items_product_id"), "cart_items", ["product_id"], unique=False)

    # 3. orders table
    op.create_table(
        "orders",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_email", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("items", JSON(), nullable=False),
        sa.Column("total_npr", sa.Integer(), nullable=False),
        sa.Column("verified_by_pip", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("verification_hash", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_orders_id"), "orders", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_orders_id"), table_name="orders")
    op.drop_table("orders")
    op.drop_index(op.f("ix_cart_items_product_id"), table_name="cart_items")
    op.drop_index(op.f("ix_cart_items_session_id"), table_name="cart_items")
    op.drop_table("cart_items")
    op.drop_index(op.f("ix_products_name"), table_name="products")
    op.drop_index(op.f("ix_products_category"), table_name="products")
    op.drop_index(op.f("ix_products_brand"), table_name="products")
    op.drop_index(op.f("ix_products_id"), table_name="products")
    op.drop_table("products")
