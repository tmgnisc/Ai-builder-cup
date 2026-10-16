import asyncio
from datetime import datetime, timezone
from typing import Protocol, runtime_checkable


@runtime_checkable
class CartRepository(Protocol):
    """Abstract interface for cart persistence."""

    async def get(self, session_id: str) -> tuple[dict[str, int], str]:
        """Returns a copy of (items: {productId: qty}, updated_at)."""
        ...

    async def save(self, session_id: str, items: dict[str, int], updated_at: str) -> None:
        """Persists items for session_id."""
        ...

    async def clear(self, session_id: str) -> None:
        """Clears items for session_id."""
        ...

    async def acquire_lock(self, session_id: str) -> asyncio.Lock:
        """Returns the mutex for session-level synchronization."""
        ...


class InMemoryCartRepository:
    """Thread-safe and async-safe in-memory cart repository with session locks."""

    def __init__(self) -> None:
        self._carts: dict[str, dict[str, int]] = {}
        self._updated_at: dict[str, str] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._master_lock = asyncio.Lock()

    async def acquire_lock(self, session_id: str) -> asyncio.Lock:
        async with self._master_lock:
            if session_id not in self._locks:
                self._locks[session_id] = asyncio.Lock()
            return self._locks[session_id]

    async def get(self, session_id: str) -> tuple[dict[str, int], str]:
        if session_id not in self._carts:
            now = datetime.now(timezone.utc).isoformat()
            self._carts[session_id] = {}
            self._updated_at[session_id] = now
        return dict(self._carts[session_id]), self._updated_at[session_id]

    async def save(self, session_id: str, items: dict[str, int], updated_at: str) -> None:
        self._carts[session_id] = dict(items)
        self._updated_at[session_id] = updated_at

    async def clear(self, session_id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self._carts[session_id] = {}
        self._updated_at[session_id] = now
