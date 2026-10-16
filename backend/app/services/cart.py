from datetime import datetime, timezone

from ..core.errors import CommerceException
from ..domain.models import AddToCartInput, Cart, CartLine, SetQtyInput
from ..repositories.cart import CartRepository
from .catalog import CatalogService


class CartService:
    """Orchestrates cart mutations, stock checks, and persistence."""

    def __init__(self, repository: CartRepository, catalog: CatalogService) -> None:
        self.repository = repository
        self.catalog = catalog

    def _to_cart(self, items: dict[str, int], updated_at: str) -> Cart:
        lines: list[CartLine] = []
        for product_id, qty in items.items():
            if qty <= 0:
                continue
            p = self.catalog.get_product(product_id)
            if not p:
                continue
            lines.append(
                CartLine(
                    productId=product_id,
                    name=f"{p.brand} {p.name}",
                    unitPrice=p.price,
                    qty=qty,
                    lineTotal=p.price * qty,
                )
            )
        item_count = sum(line.qty for line in lines)
        subtotal = sum(line.lineTotal for line in lines)
        return Cart(
            lines=lines,
            itemCount=item_count,
            subtotal=subtotal,
            updatedAt=updated_at,
        )

    async def get_cart(self, session_id: str) -> Cart:
        items, updated_at = await self.repository.get(session_id)
        return self._to_cart(items, updated_at)

    async def add_to_cart(self, session_id: str, input_data: AddToCartInput, drop_write: bool = False) -> Cart:
        p = self.catalog.get_product(input_data.productId)
        if not p:
            raise CommerceException("NOT_FOUND", f'No product with id "{input_data.productId}".')
        if p.stock == 0:
            raise CommerceException("OUT_OF_STOCK", f"{p.brand} {p.name} is out of stock.")

        lock = await self.repository.acquire_lock(session_id)
        async with lock:
            items, _ = await self.repository.get(session_id)
            current_qty = items.get(p.id, 0)
            desired = current_qty + input_data.qty
            if desired > p.stock:
                raise CommerceException(
                    "INSUFFICIENT_STOCK",
                    f"Only {p.stock} of {p.brand} {p.name} available.",
                )
            next_items = dict(items)
            next_items[p.id] = desired
            updated_at = datetime.now(timezone.utc).isoformat()
            if not drop_write:
                await self.repository.save(session_id, next_items, updated_at)
            return self._to_cart(next_items, updated_at)

    async def set_qty(self, session_id: str, input_data: SetQtyInput, drop_write: bool = False) -> Cart:
        lock = await self.repository.acquire_lock(session_id)
        async with lock:
            items, _ = await self.repository.get(session_id)
            if input_data.productId not in items:
                raise CommerceException("NOT_IN_CART", "That item isn't in the cart.")
            p = self.catalog.get_product(input_data.productId)
            if p and input_data.qty > p.stock:
                raise CommerceException(
                    "INSUFFICIENT_STOCK",
                    f"Only {p.stock} of {p.brand} {p.name} available.",
                )
            next_items = dict(items)
            if input_data.qty == 0:
                next_items.pop(input_data.productId, None)
            else:
                next_items[input_data.productId] = input_data.qty
            updated_at = datetime.now(timezone.utc).isoformat()
            if not drop_write:
                await self.repository.save(session_id, next_items, updated_at)
            return self._to_cart(next_items, updated_at)

    async def remove_from_cart(self, session_id: str, product_id: str, drop_write: bool = False) -> Cart:
        lock = await self.repository.acquire_lock(session_id)
        async with lock:
            items, _ = await self.repository.get(session_id)
            if product_id not in items:
                raise CommerceException("NOT_IN_CART", "That item isn't in the cart.")
            next_items = dict(items)
            next_items.pop(product_id, None)
            updated_at = datetime.now(timezone.utc).isoformat()
            if not drop_write:
                await self.repository.save(session_id, next_items, updated_at)
            return self._to_cart(next_items, updated_at)

    async def clear_cart(self, session_id: str) -> Cart:
        lock = await self.repository.acquire_lock(session_id)
        async with lock:
            await self.repository.clear(session_id)
            now = datetime.now(timezone.utc).isoformat()
            return Cart(lines=[], itemCount=0, subtotal=0, updatedAt=now)
