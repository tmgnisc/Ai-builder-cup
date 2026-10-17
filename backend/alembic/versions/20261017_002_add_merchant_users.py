"""Add merchant_users table for operations authentication

Revision ID: 002_add_merchant_users
Revises: 001_initial_schema
Create Date: 2026-10-17 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_add_merchant_users"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "merchant_users",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="Store Administrator"),
        sa.Column("store_name", sa.String(length=100), nullable=False, server_default="Persona Flagship Operations"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f("ix_merchant_users_id"), "merchant_users", ["id"], unique=False)
    op.create_index(op.f("ix_merchant_users_email"), "merchant_users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_merchant_users_email"), table_name="merchant_users")
    op.drop_index(op.f("ix_merchant_users_id"), table_name="merchant_users")
    op.drop_table("merchant_users")
