import pytest

from app.domain.chaos import ChaosConfig
from app.repositories.cart import InMemoryCartRepository
from app.services.cart import CartService
from app.services.catalog import CatalogService
from app.tools.executor import execute_tool, tool_declarations
from app.tools.models import ToolContext
from app.tools.registry import TOOLS


@pytest.fixture
def tool_context() -> ToolContext:
    catalog_service = CatalogService()
    cart_repo = InMemoryCartRepository()
    cart_service = CartService(cart_repo, catalog_service)
    chaos = ChaosConfig(latency_min=0, latency_max=0, failure_rate=0.0)
    return ToolContext(
        session_id="test-tool-session",
        chaos=chaos,
        catalog_service=catalog_service,
        cart_service=cart_service,
    )


def test_tool_declarations() -> None:
    decls = tool_declarations()
    assert len(decls) == len(TOOLS)
    names = {d["name"] for d in decls}
    assert "search_products" in names
    assert "add_to_cart" in names
    assert "get_cart" in names
    for d in decls:
        assert "description" in d
        assert "parameters" in d


@pytest.mark.asyncio
async def test_search_products_tool(tool_context: ToolContext) -> None:
    res = await execute_tool(
        "search_products",
        {"category": "laptops", "minRamGB": 16, "limit": 5},
        tool_context,
    )
    assert res.ok is True
    assert res.output is not None
    assert res.output["total"] > 0
    assert "result" in res.summary


@pytest.mark.asyncio
async def test_get_product_tool(tool_context: ToolContext) -> None:
    res = await execute_tool("get_product", {"productId": "acer-swift-go-14"}, tool_context)
    assert res.ok is True
    assert res.output is not None
    assert res.output["id"] == "acer-swift-go-14"
    assert res.summary == "Acer Swift Go 14"

    res_fail = await execute_tool("get_product", {"productId": "not-a-product"}, tool_context)
    assert res_fail.ok is False
    assert res_fail.error is not None
    assert res_fail.error["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_compare_products_tool(tool_context: ToolContext) -> None:
    res = await execute_tool(
        "compare_products",
        {"productIds": ["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]},
        tool_context,
    )
    assert res.ok is True
    assert res.output is not None
    assert res.output["winnerId"] is not None
    assert "IdeaPad" in res.output["verdict"]


@pytest.mark.asyncio
async def test_check_stock_tool(tool_context: ToolContext) -> None:
    # In stock
    res_in = await execute_tool("check_stock", {"productId": "acer-swift-go-14"}, tool_context)
    assert res_in.ok is True
    assert res_in.output is not None
    assert res_in.output["inStock"] is True
    assert "in stock" in res_in.summary

    # Out of stock
    res_out = await execute_tool("check_stock", {"productId": "lenovo-thinkpad-e14-g6"}, tool_context)
    assert res_out.ok is True
    assert res_out.output is not None
    assert res_out.output["inStock"] is False
    assert res_out.summary == "out of stock"


@pytest.mark.asyncio
async def test_get_delivery_info_tool(tool_context: ToolContext) -> None:
    res = await execute_tool("get_delivery_info", {"city": "Kathmandu"}, tool_context)
    assert res.ok is True
    assert res.output is not None
    assert res.output["zone"] == "valley"
    assert res.output["fee"] == 100
    assert "1–2 days" in res.summary


@pytest.mark.asyncio
async def test_cart_tools_lifecycle(tool_context: ToolContext) -> None:
    # 1. Add to cart
    add_res = await execute_tool("add_to_cart", {"productId": "acer-swift-go-14", "qty": 2}, tool_context)
    assert add_res.ok is True
    assert add_res.output is not None
    assert add_res.output["cart"]["itemCount"] == 2

    # 2. Get cart
    get_res = await execute_tool("get_cart", {}, tool_context)
    assert get_res.ok is True
    assert get_res.output is not None
    assert get_res.output["itemCount"] == 2

    # 3. Remove from cart
    rem_res = await execute_tool("remove_from_cart", {"productId": "acer-swift-go-14"}, tool_context)
    assert rem_res.ok is True
    assert rem_res.output is not None
    assert rem_res.output["cart"]["itemCount"] == 0


@pytest.mark.asyncio
async def test_tool_executor_error_handling(tool_context: ToolContext) -> None:
    # Invalid tool name
    bad_tool = await execute_tool("nonexistent_tool", {}, tool_context)
    assert bad_tool.ok is False
    assert bad_tool.error is not None
    assert bad_tool.error["code"] == "UNKNOWN_TOOL"

    # Invalid input schema
    bad_input = await execute_tool("compare_products", {"productIds": ["one-only"]}, tool_context)
    assert bad_input.ok is False
    assert bad_input.error is not None
    assert bad_input.error["code"] == "INVALID_INPUT"

    # Transient chaos failure
    tool_context.chaos = ChaosConfig(latency_min=0, latency_max=0, failure_rate=1.0)
    chaos_res = await execute_tool("get_product", {"productId": "acer-swift-go-14"}, tool_context)
    assert chaos_res.ok is False
    assert chaos_res.error is not None
    assert chaos_res.error["code"] == "TRANSIENT"
