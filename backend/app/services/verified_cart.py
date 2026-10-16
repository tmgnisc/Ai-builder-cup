from ..domain.models import AddToCartInput, VerifiedChange
from ..repositories.cart import CartRepository
from .cart import CartService
from .catalog import CatalogService


class VerifiedCartService(CartService):
    """Enforces verify-after-act by re-reading the cart after add/remove mutations.

    Detects silent chaos failures (where success is reported but write was dropped),
    returning verified=False.
    """

    def __init__(self, repository: CartRepository, catalog: CatalogService) -> None:
        super().__init__(repository, catalog)

    async def add(self, session_id: str, input_data: AddToCartInput, drop_write: bool = False) -> VerifiedChange:
        pre_cart = await self.get_cart(session_id)
        pre_qty = next(
            (line.qty for line in pre_cart.lines if line.productId == input_data.productId),
            0,
        )
        expected_qty = pre_qty + input_data.qty

        # Perform the requested mutation (might drop write in silent chaos mode)
        await self.add_to_cart(session_id, input_data, drop_write=drop_write)

        # Always re-read the cart from persistence
        post_cart = await self.get_cart(session_id)
        post_qty = next(
            (line.qty for line in post_cart.lines if line.productId == input_data.productId),
            0,
        )

        verified = post_qty == expected_qty
        return VerifiedChange(
            requested_change={
                "action": "add",
                "productId": input_data.productId,
                "qty": input_data.qty,
            },
            verified=verified,
            cart=post_cart,
        )

    async def remove(self, session_id: str, product_id: str, drop_write: bool = False) -> VerifiedChange:
        # Perform the requested mutation (might drop write in silent chaos mode)
        await self.remove_from_cart(session_id, product_id, drop_write=drop_write)

        # Always re-read the cart from persistence
        post_cart = await self.get_cart(session_id)
        verified = not any(line.productId == product_id for line in post_cart.lines)

        return VerifiedChange(
            requested_change={"action": "remove", "productId": product_id},
            verified=verified,
            cart=post_cart,
        )
