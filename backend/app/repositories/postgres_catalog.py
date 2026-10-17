import logging
from typing import Sequence

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..domain.models import Product, ProductSpecs
from ..models.db import ProductDB

logger = logging.getLogger(__name__)


def row_to_product(row: ProductDB) -> Product:
    """Converts a SQLAlchemy ProductDB row to a validated domain Product model."""
    raw_specs = dict(row.specs) if row.specs else {}
    return Product(
        id=row.id,
        name=row.name,
        brand=row.brand,
        category=row.category,
        price=row.price,
        stock=row.stock,
        rating=row.rating,
        reviewCount=row.review_count,
        blurb=row.blurb,
        tags=list(row.tags) if row.tags else [],
        specs=ProductSpecs(**raw_specs),
        palette=tuple(row.palette) if row.palette and len(row.palette) == 2 else ("#181716", "#FBFBFA"),
        image=getattr(row, "image", None),
    )


class PostgresCatalogRepository:
    """PostgreSQL repository for catalog products and stock tracking."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession] | None = None) -> None:
        self.session_factory = session_factory

    async def get_all(self) -> list[Product]:
        if not self.session_factory:
            return []
        try:
            async with self.session_factory() as session:
                stmt = select(ProductDB).order_by(ProductDB.category, ProductDB.name)
                result = await session.execute(stmt)
                rows = result.scalars().all()
                return [row_to_product(r) for r in rows]
        except Exception as exc:
            logger.warning("PostgresCatalogRepository.get_all failed (%s)", exc)
            return []

    async def get_product(self, product_id: str) -> Product | None:
        if not self.session_factory:
            return None
        try:
            async with self.session_factory() as session:
                stmt = select(ProductDB).where(ProductDB.id == product_id)
                result = await session.execute(stmt)
                row = result.scalar_one_or_none()
                return row_to_product(row) if row else None
        except Exception as exc:
            logger.warning("PostgresCatalogRepository.get_product failed (%s)", exc)
            return None

    async def update_stock(self, product_id: str, new_stock: int) -> bool:
        if not self.session_factory:
            return False
        try:
            async with self.session_factory() as session:
                stmt = (
                    update(ProductDB)
                    .where(ProductDB.id == product_id)
                    .values(stock=max(0, new_stock))
                )
                await session.execute(stmt)
                await session.commit()
                return True
        except Exception as exc:
            logger.warning("PostgresCatalogRepository.update_stock failed (%s)", exc)
            return False
