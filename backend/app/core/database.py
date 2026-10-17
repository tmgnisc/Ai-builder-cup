import json
import logging
from pathlib import Path
from typing import AsyncGenerator

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from ..models.db import Base, ProductDB
from .config import get_settings

logger = logging.getLogger(__name__)

import asyncio

_engine = None
_engine_loop = None
_session_factory = None

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "products.json"


def get_engine():
    global _engine, _engine_loop, _session_factory
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _engine is None or (_engine_loop is not None and current_loop is not None and _engine_loop is not current_loop):
        settings = get_settings()
        db_url = settings.database_url
        if not db_url:
            return None
        _engine = create_async_engine(
            db_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        _engine_loop = current_loop
        _session_factory = None
    elif _engine_loop is None and current_loop is not None:
        _engine_loop = current_loop

    return _engine


def get_session_factory():
    global _session_factory
    engine = get_engine()
    if engine is None:
        return None
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def init_db() -> bool:
    """Creates database tables and inserts any catalog products missing from the products table."""
    engine = get_engine()
    if engine is None:
        logger.info("No DATABASE_URL configured; skipping database initialization.")
        return False

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS image VARCHAR(500);"))
        logger.info("Database schema verified / created successfully.")

        session_factory = get_session_factory()
        if session_factory is not None:
            async with session_factory() as session:
                # Insert catalog products that aren't in the table yet (new products added to
                # products.json reach an already-seeded database; existing rows and stock are untouched).
                if DATA_PATH.exists():
                    with open(DATA_PATH, "r", encoding="utf-8") as f:
                        raw = json.load(f)
                    existing = set((await session.execute(select(ProductDB.id))).scalars().all())
                    missing = [item for item in raw if item["id"] not in existing]
                    for item in missing:
                        session.add(
                            ProductDB(
                                id=item["id"],
                                name=item["name"],
                                brand=item["brand"],
                                category=item["category"],
                                price=item["price"],
                                stock=item["stock"],
                                rating=item.get("rating", 0.0),
                                review_count=item.get("reviewCount", 0),
                                blurb=item.get("blurb", ""),
                                tags=item.get("tags", []),
                                specs=item.get("specs", {}),
                                palette=item.get("palette", []),
                                image=item.get("image"),
                            )
                        )
                    for item in raw:
                        if item.get("image"):
                            await session.execute(
                                update(ProductDB)
                                .where(ProductDB.id == item["id"])
                                .where(ProductDB.image.is_(None))
                                .values(image=item["image"])
                            )
                    await session.commit()
                    if missing:
                        logger.info("Seeded %d new catalog products into PostgreSQL.", len(missing))

            # Check if orders table already has records
            from ..models.db import OrderDB
            from ..data.orders import INITIAL_ORDERS
            res_orders = await session.execute(select(OrderDB.id).limit(1))
            if res_orders.scalar_one_or_none() is None:
                logger.info("Seeding initial orders into PostgreSQL...")
                from datetime import datetime, timezone
                for o in INITIAL_ORDERS:
                    order_row = OrderDB(
                        id=o["id"],
                        customer_name=o["customerName"],
                        customer_email=o["customerEmail"],
                        city=o["city"],
                        items=o["items"],
                        total_npr=o["totalNPR"],
                        verified_by_pip=o.get("verifiedByPip", True),
                        verification_hash=o.get("verificationHash", "pip_init"),
                        status=o["status"],
                        notes=o.get("notes"),
                        created_at=datetime.now(timezone.utc),
                    )
                    session.add(order_row)
                await session.commit()
                logger.info("Successfully seeded %d orders into PostgreSQL.", len(INITIAL_ORDERS))

            # Check if merchant user exists
            from ..models.db import MerchantUserDB
            from .security import hash_password
            res_merchant = await session.execute(select(MerchantUserDB.id).limit(1))
            if res_merchant.scalar_one_or_none() is None:
                logger.info("Seeding default merchant user into PostgreSQL...")
                from datetime import datetime, timezone
                admin_user = MerchantUserDB(
                    id="usr_admin_01",
                    email="admin@persona.store",
                    password_hash=hash_password("persona2026"),
                    name="Operations Lead",
                    role="Store Administrator",
                    store_name="Persona Flagship Store",
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                )
                session.add(admin_user)
                await session.commit()
                logger.info("Successfully seeded default merchant user (admin@persona.store).")
        return True
    except Exception as exc:
        logger.warning("Could not initialize PostgreSQL database (%s). Running with fallback.", exc)
        return False


async def get_db() -> AsyncGenerator[AsyncSession | None, None]:
    """Dependency for obtaining an active AsyncSession."""
    factory = get_session_factory()
    if factory is None:
        yield None
        return
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
