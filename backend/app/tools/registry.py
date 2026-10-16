from typing import Any

from ..core.errors import CommerceException, ToolError
from ..domain.chaos import roll_failure
from ..domain.delivery import delivery_for
from ..domain.format import format_npr
from ..domain.models import AddToCartInput, Cart, DeliveryInfo, Product, ProductQuery
from .models import (
    AddToCartToolInput,
    CartOutput,
    CheckStockInput,
    CheckStockOutput,
    CompareProductsInput,
    CompareProductsOutput,
    EmptyInput,
    GetDeliveryInfoInput,
    GetProductInput,
    RemoveFromCartToolInput,
    SearchProductsInput,
    SearchProductsOutput,
    ToolContext,
    ToolDefinition,
)

# --- Handlers ---


def handle_search_products(inp: SearchProductsInput, ctx: ToolContext) -> SearchProductsOutput:
    query = ProductQuery(
        q=inp.q,
        category=inp.category,
        minPrice=inp.minPrice,
        maxPrice=inp.maxPrice,
        minRamGB=inp.minRamGB,
        minBatteryHours=inp.minBatteryHours,
        maxWeightGrams=inp.maxWeightGrams,
        tags=inp.tags,
        brands=inp.brands,
        sort=inp.sort,
        limit=inp.limit,
    )
    res = ctx.catalog_service.search(query)
    searched = ctx.catalog_service.search(ProductQuery(category=inp.category)).total
    return SearchProductsOutput(products=res.products, total=res.total, searched=searched)


def handle_get_product(inp: GetProductInput, ctx: ToolContext) -> Product:
    p = ctx.catalog_service.get_product(inp.productId)
    if not p:
        raise ToolError("NOT_FOUND", f'No product with id "{inp.productId}".')
    return p


def handle_compare_products(inp: CompareProductsInput, ctx: ToolContext) -> CompareProductsOutput:
    products: list[Product] = []
    for pid in inp.productIds:
        p = ctx.catalog_service.get_product(pid)
        if not p:
            raise ToolError("NOT_FOUND", f'No product with id "{pid}".')
        products.append(p)
    r = ctx.catalog_service.compare(products, inp.priorities, inp.context)
    return CompareProductsOutput(
        productIds=r.productIds,
        winnerId=r.winnerId,
        verdict=r.verdict,
        advantages=r.advantages,
    )


def handle_check_stock(inp: CheckStockInput, ctx: ToolContext) -> CheckStockOutput:
    p = ctx.catalog_service.get_product(inp.productId)
    if not p:
        raise ToolError("NOT_FOUND", f'No product with id "{inp.productId}".')
    return CheckStockOutput(productId=inp.productId, inStock=p.stock > 0, quantity=p.stock)


def handle_get_delivery_info(inp: GetDeliveryInfoInput, ctx: ToolContext) -> DeliveryInfo:
    return delivery_for(inp.city)


async def handle_add_to_cart(inp: AddToCartToolInput, ctx: ToolContext) -> CartOutput:
    failure = roll_failure(ctx.chaos, mutation=True)
    if failure == "transient":
        raise ToolError("TRANSIENT", "Store service unavailable.")
    try:
        cart = await ctx.cart_service.add_to_cart(
            ctx.session_id,
            AddToCartInput(productId=inp.productId, qty=inp.qty),
            drop_write=(failure == "silent"),
        )
        return CartOutput(cart=cart)
    except CommerceException as e:
        raise ToolError(e.code, e.message) from e


async def handle_remove_from_cart(inp: RemoveFromCartToolInput, ctx: ToolContext) -> CartOutput:
    failure = roll_failure(ctx.chaos, mutation=True)
    if failure == "transient":
        raise ToolError("TRANSIENT", "Store service unavailable.")
    try:
        cart = await ctx.cart_service.remove_from_cart(ctx.session_id, inp.productId, drop_write=(failure == "silent"))
        return CartOutput(cart=cart)
    except CommerceException as e:
        raise ToolError(e.code, e.message) from e


async def handle_get_cart(_inp: EmptyInput, ctx: ToolContext) -> Cart:
    return await ctx.cart_service.get_cart(ctx.session_id)


# --- Tool Registry ---

TOOLS: dict[str, ToolDefinition[Any, Any]] = {
    "search_products": ToolDefinition(
        name="search_products",
        description=("Search the catalog with structured filters. Returns matching products, best matches first."),
        input_model=SearchProductsInput,
        output_model=SearchProductsOutput,
        handler=handle_search_products,
        summarize=lambda o: f"{o.total} result{'s' if o.total != 1 else ''} of {o.searched}",
        mutation=False,
    ),
    "get_product": ToolDefinition(
        name="get_product",
        description="Fetch one product with full specs and live stock.",
        input_model=GetProductInput,
        output_model=Product,
        handler=handle_get_product,
        summarize=lambda p: f"{p.brand} {p.name}",
        mutation=False,
    ),
    "compare_products": ToolDefinition(
        name="compare_products",
        description=("Compare 2–4 products attribute by attribute using catalog values only, with a grounded verdict."),
        input_model=CompareProductsInput,
        output_model=CompareProductsOutput,
        handler=handle_compare_products,
        summarize=lambda o: f"{len(o.productIds)} products · {'winner found' if o.winnerId else 'close call'}",
        mutation=False,
    ),
    "check_stock": ToolDefinition(
        name="check_stock",
        description="Check live stock for a product.",
        input_model=CheckStockInput,
        output_model=CheckStockOutput,
        handler=handle_check_stock,
        summarize=lambda o: f"in stock ({o.quantity})" if o.inStock else "out of stock",
        mutation=False,
    ),
    "get_delivery_info": ToolDefinition(
        name="get_delivery_info",
        description="Delivery time and fee for a city in Nepal.",
        input_model=GetDeliveryInfoInput,
        output_model=DeliveryInfo,
        handler=handle_get_delivery_info,
        summarize=lambda o: f"{o.city} · {o.days}",
        mutation=False,
    ),
    "add_to_cart": ToolDefinition(
        name="add_to_cart",
        description=("Add a product to the user's cart. The runtime always verifies with get_cart afterwards."),
        input_model=AddToCartToolInput,
        output_model=CartOutput,
        handler=handle_add_to_cart,
        summarize=lambda _o: "Added to cart, stock confirmed",
        mutation=True,
    ),
    "remove_from_cart": ToolDefinition(
        name="remove_from_cart",
        description=(
            "Remove a product line from the user's cart. The runtime always verifies with get_cart afterwards."
        ),
        input_model=RemoveFromCartToolInput,
        output_model=CartOutput,
        handler=handle_remove_from_cart,
        summarize=lambda _o: "Removed from cart",
        mutation=True,
    ),
    "get_cart": ToolDefinition(
        name="get_cart",
        description="Read the user's current cart.",
        input_model=EmptyInput,
        output_model=Cart,
        handler=handle_get_cart,
        summarize=lambda c: f"{c.itemCount} item{'s' if c.itemCount != 1 else ''} · {format_npr(c.subtotal)}",
        mutation=False,
    ),
}
