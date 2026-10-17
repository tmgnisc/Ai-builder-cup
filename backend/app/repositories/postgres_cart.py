import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..models.db import CartItemDB
from .cart import CartRepository, InMemoryCartRepository

logger = logging.getLogger(__name__)


class PostgresCartRepository:
    """PostgreSQL-backed CartRepository with async session persistence."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
        fallback: InMemoryCartRepository | None = None,
    ) -> None:
        self.session_factory = session_factory
        self.fallback = fallback or InMemoryCartRepository()
        self._locks: dict[str, asyncio.Lock] = {}
        self._master_lock = asyncio.Lock()

    async def acquire_lock(self, session_id: str) -> asyncio.Lock:
        async with self._master_lock:
            if session_id not in self._locks:
                self._locks[session_id] = asyncio.Lock()
            return self._locks[session_id]

    async def get(self, session_id: str) -> tuple[dict[str, int], str]:
        if not self.session_factory:
            return await self.fallback.get(session_id)

        try:
            async with self.session_factory() as session:
                stmt = select(CartItemDB).where(CartItemDB.session_id == session_id)
                result = await session.execute(stmt)
                rows = result.scalars().all()

                if not rows:
                    return await self.fallback.get(session_id)

                items: dict[str, int] = {}
                latest_ts = datetime.now(timezone.utc).isoformat()
                for r in rows:
                    items[r.product_id] = r.qty
                    if r.updated_at:
                        latest_ts = r.updated_at.isoformat()

                return items, latest_ts
        except Exception as exc:
            logger.warning("PostgresCartRepository.get failed (%s), using fallback", exc)
            return await self.fallback.get(session_id)

    async def save(self, session_id: str, items: dict[str, int], updated_at: str) -> None:
        # Keep fallback updated for instant lock/read sync
        await self.fallback.save(session_id, items, updated_at)

        if not self.session_factory:
            return

        try:
            now_dt = datetime.fromisoformat(updated_at) if updated_at else datetime.now(timezone.utc)
            async with self.session_factory() as session:
                # Replace existing items for this session
                await session.execute(
                    delete(CartItemDB).where(CartItemDB.session_id == session_id)
                )
                for pid, qty in items.items():
                    if qty > 0:
                        session.add(
                            CartItemDB(
                                session_id=session_id,
                                product_id=pid,
                                qty=qty,
                                updated_at=now_dt,
                            )
                        )
                await session.commit()
        except Exception as exc:
            logger.warning("PostgresCartRepository.save failed (%s)", exc)

    async def clear(self, session_id: str) -> None:
        await self.fallback.clear(session_id)
        if not self.session_factory:
            return

        try:
            async with self.session_factory() as session:
                await session.execute(
                    delete(CartItemDB).where(CartItemDB.session_id == session_id)
                )
                await session.commit()
        except Exception as exc:
            logger.warning("PostgresCartRepository.clear failed (%s)", exc)
