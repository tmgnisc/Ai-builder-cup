import asyncio

import pytest

from app.core.errors import CommerceException
from app.domain.models import AddToCartInput, ProductQuery, SetQtyInput
from app.repositories.cart import InMemoryCartRepository
from app.services.cart import CartService
from app.services.catalog import CatalogService
from app.services.verified_cart import VerifiedCartService


@pytest.fixture
def catalog_service() -> CatalogService:
    return CatalogService()


@pytest.fixture
def cart_repo() -> InMemoryCartRepository:
    return InMemoryCartRepository()


@pytest.fixture
def cart_service(cart_repo: InMemoryCartRepository, catalog_service: CatalogService) -> CartService:
    return CartService(repository=cart_repo, catalog=catalog_service)


@pytest.fixture
def verified_cart_service(cart_repo: InMemoryCartRepository, catalog_service: CatalogService) -> VerifiedCartService:
    return VerifiedCartService(repository=cart_repo, catalog=catalog_service)


def test_catalog_service_operations(catalog_service: CatalogService) -> None:
    all_prods = catalog_service.get_all()
    assert len(all_prods) >= 28

    p = catalog_service.get_product("acer-swift-go-14")
    assert p is not None
    assert p.id == "acer-swift-go-14"

    search_res = catalog_service.search(ProductQuery(q="docker"))
    assert search_res.total > 0

    brands = catalog_service.get_brands("laptops")
    assert "Acer" in brands

    cmp_res = catalog_service.compare([all_prods[0], all_prods[1]])
    assert cmp_res.productIds == [all_prods[0].id, all_prods[1].id]


@pytest.mark.asyncio
async def test_cart_service_add_and_get(cart_service: CartService) -> None:
    sid = "test-session-1"
    cart = await cart_service.add_to_cart(sid, AddToCartInput(productId="acer-swift-go-14", qty=2))
    assert cart.itemCount == 2
    assert len(cart.lines) == 1
    assert cart.lines[0].productId == "acer-swift-go-14"
    assert cart.lines[0].qty == 2

    read_cart = await cart_service.get_cart(sid)
    assert read_cart.itemCount == 2


@pytest.mark.asyncio
async def test_cart_service_out_of_stock(cart_service: CartService) -> None:
    sid = "test-session-oos"
    with pytest.raises(CommerceException) as exc_info:
        await cart_service.add_to_cart(sid, AddToCartInput(productId="lenovo-thinkpad-e14-g6", qty=1))
    assert exc_info.value.code == "OUT_OF_STOCK"


@pytest.mark.asyncio
async def test_cart_service_unknown_product(cart_service: CartService) -> None:
    sid = "test-session-unknown"
    with pytest.raises(CommerceException) as exc_info:
        await cart_service.add_to_cart(sid, AddToCartInput(productId="nonexistent-item-999", qty=1))
    assert exc_info.value.code == "NOT_FOUND"


@pytest.mark.asyncio
async def test_cart_service_insufficient_stock(cart_service: CartService) -> None:
    sid = "test-session-limits"
    with pytest.raises(CommerceException) as exc_info:
        await cart_service.add_to_cart(sid, AddToCartInput(productId="lenovo-loq-15", qty=5))
    assert exc_info.value.code == "INSUFFICIENT_STOCK"

    await cart_service.add_to_cart(sid, AddToCartInput(productId="lenovo-loq-15", qty=2))

    with pytest.raises(CommerceException) as exc_info2:
        await cart_service.add_to_cart(sid, AddToCartInput(productId="lenovo-loq-15", qty=1))
    assert exc_info2.value.code == "INSUFFICIENT_STOCK"


@pytest.mark.asyncio
async def test_cart_service_set_qty_and_remove(cart_service: CartService) -> None:
    sid = "test-session-mutate"
    await cart_service.add_to_cart(sid, AddToCartInput(productId="acer-swift-go-14", qty=1))

    c = await cart_service.set_qty(sid, SetQtyInput(productId="acer-swift-go-14", qty=3))
    assert c.lines[0].qty == 3

    c = await cart_service.set_qty(sid, SetQtyInput(productId="acer-swift-go-14", qty=0))
    assert c.itemCount == 0
    assert len(c.lines) == 0

    with pytest.raises(CommerceException) as exc:
        await cart_service.remove_from_cart(sid, "acer-swift-go-14")
    assert exc.value.code == "NOT_IN_CART"


@pytest.mark.asyncio
async def test_cart_service_clear(cart_service: CartService) -> None:
    sid = "test-session-clear"
    await cart_service.add_to_cart(sid, AddToCartInput(productId="acer-swift-go-14", qty=1))
    c = await cart_service.clear_cart(sid)
    assert c.itemCount == 0
    assert len(c.lines) == 0


@pytest.mark.asyncio
async def test_verified_cart_service_normal_and_silent_drop(
    verified_cart_service: VerifiedCartService,
) -> None:
    sid = "test-verified-session"

    res = await verified_cart_service.add(sid, AddToCartInput(productId="acer-swift-go-14", qty=1), drop_write=False)
    assert res.verified is True
    assert res.requested_change == {"action": "add", "productId": "acer-swift-go-14", "qty": 1}
    assert res.cart.itemCount == 1

    res_silent = await verified_cart_service.add(
        sid, AddToCartInput(productId="lenovo-ideapad-slim-5-14", qty=1), drop_write=True
    )
    assert res_silent.verified is False
    assert res_silent.cart.itemCount == 1
    assert not any(line.productId == "lenovo-ideapad-slim-5-14" for line in res_silent.cart.lines)

    res_remove_silent = await verified_cart_service.remove(sid, "acer-swift-go-14", drop_write=True)
    assert res_remove_silent.verified is False
    assert res_remove_silent.cart.itemCount == 1

    res_remove = await verified_cart_service.remove(sid, "acer-swift-go-14", drop_write=False)
    assert res_remove.verified is True
    assert res_remove.cart.itemCount == 0


@pytest.mark.asyncio
async def test_concurrent_cart_updates_for_one_session(cart_service: CartService) -> None:
    sid = "concurrent-session"
    tasks = [
        cart_service.add_to_cart(sid, AddToCartInput(productId="lenovo-ideapad-slim-5-14", qty=1)) for _ in range(5)
    ]
    results = await asyncio.gather(*tasks)
    assert len(results) == 5

    final_cart = await cart_service.get_cart(sid)
    assert final_cart.itemCount == 5
    assert final_cart.lines[0].qty == 5
