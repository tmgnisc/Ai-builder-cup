import contextvars
from dataclasses import dataclass, field
from typing import Any

from google.adk.tools.function_tool import FunctionTool

from ..core.errors import ToolError
from ..domain.chaos import ChaosConfig, resolve_chaos, roll_failure
from ..domain.models import AddToCartInput, ProductQuery
from ..services.catalog import CatalogService
from ..services.verified_cart import VerifiedCartService
from .adapter import AgentMemory


@dataclass
class AgentTurnContext:
    """Holds per-turn state for the agent, injected via contextvars."""

    session_id: str
    catalog_service: CatalogService
    verified_cart_service: VerifiedCartService
    chaos: ChaosConfig | None = None
    force_silent_drop: bool = False
    original_question: str | None = None
    memory: AgentMemory = field(default_factory=AgentMemory)
    event_queue: list[Any] = field(default_factory=list)
    tool_call_count: int = 0
    message_id: str = "msg_0"
    is_cart_mutation_turn: bool = False
    last_cart_verified: bool | None = None
    active_cart_block_id: str | None = None
    pending_tool_starts: dict[str, float] = field(default_factory=dict)


current_turn_context: contextvars.ContextVar[AgentTurnContext] = contextvars.ContextVar("current_turn_context")

ALLOWED_TOOLS = {
    "search_products",
    "get_product",
    "compare_products",
    "check_stock",
    "get_delivery_info",
    "add_to_cart",
    "remove_from_cart",
    "get_cart",
    "ui_action",
    "record_missing_info",
}

ALLOWED_UI_ACTIONS = {
    "highlight",
    "move_to",
    "scroll_to",
    "set_filters",
    "open_drawer",
    "open_compare",
    "cart_updated",
    "navigate",
}


def search_products(
    q: str | None = None,
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_ram_gb: int | None = None,
    min_battery_hours: int | None = None,
    max_weight_grams: int | None = None,
    tags: list[str] | None = None,
    brands: list[str] | None = None,
    sort: str | None = None,
    limit: int = 12,
) -> dict[str, Any]:
    """Search the product catalog using structured filters.

    Args:
        q: Optional search query text
        category: Category (laptops, phones, headphones, accessories)
        min_price: Minimum price in NPR
        max_price: Maximum price in NPR
        min_ram_gb: Minimum RAM in GB
        min_battery_hours: Minimum battery life in hours
        max_weight_grams: Maximum weight in grams
        tags: List of feature tags (e.g. travel, developer, oled, anc)
        brands: List of brand names
        sort: Sort order (relevance, price-asc, price-desc, rating, battery, weight)
        limit: Maximum results to return
    """
    ctx = current_turn_context.get()
    query = ProductQuery(
        q=q,
        category=category,  # type: ignore[arg-type]
        minPrice=min_price,
        maxPrice=max_price,
        minRamGB=min_ram_gb,
        minBatteryHours=min_battery_hours,
        maxWeightGrams=max_weight_grams,
        tags=tags,
        brands=brands,
        sort=sort,  # type: ignore[arg-type]
        limit=limit,
    )
    res = ctx.catalog_service.search(query)
    searched = ctx.catalog_service.search(ProductQuery(category=category)).total  # type: ignore[arg-type]
    return {
        "products": [p.model_dump() for p in res.products],
        "total": res.total,
        "searched": searched,
    }


def get_product(product_id: str) -> dict[str, Any]:
    """Fetch complete product specifications, pricing and live stock for a product ID.

    Args:
        product_id: The unique product identifier (e.g. 'lenovo-ideapad-slim-5-14')
    """
    ctx = current_turn_context.get()
    p = ctx.catalog_service.get_product(product_id)
    if not p:
        raise ToolError("NOT_FOUND", f'No product with id "{product_id}".')
    return p.model_dump()


def compare_products(
    product_ids: list[str],
    priorities: list[str] | None = None,
    context: str | None = None,
) -> dict[str, Any]:
    """Compare 2–4 products attribute by attribute using catalog values only, with a grounded verdict.

    Args:
        product_ids: List of 2 to 4 product IDs to compare
        priorities: Attributes to prioritize (price, ram, storage, battery, weight, warranty, rating)
        context: Optional user context for the comparison (e.g. 'Docker + travel')
    """
    ctx = current_turn_context.get()
    products = []
    for pid in product_ids:
        p = ctx.catalog_service.get_product(pid)
        if not p:
            raise ToolError("NOT_FOUND", f'No product with id "{pid}".')
        products.append(p)
    r = ctx.catalog_service.compare(products, priorities, context)  # type: ignore[arg-type]
    return {
        "productIds": r.productIds,
        "winnerId": r.winnerId,
        "verdict": r.verdict,
        "advantages": r.advantages,
    }


def check_stock(product_id: str) -> dict[str, Any]:
    """Check live stock availability and quantity for a product.

    Args:
        product_id: The unique product identifier
    """
    ctx = current_turn_context.get()
    p = ctx.catalog_service.get_product(product_id)
    if not p:
        raise ToolError("NOT_FOUND", f'No product with id "{product_id}".')
    return {
        "productId": product_id,
        "inStock": p.stock > 0,
        "quantity": p.stock,
    }


def get_delivery_info(city: str) -> dict[str, Any]:
    """Get delivery time, fee and notes for a destination city.

    Args:
        city: Destination city name (e.g. 'Kathmandu', 'Pokhara', 'Biratnagar')
    """
    from ..domain.delivery import delivery_for

    return delivery_for(city).model_dump()


async def add_to_cart(product_id: str, qty: int = 1) -> dict[str, Any]:
    """Add a product to the user's shopping cart. Always verified against persistence.

    Args:
        product_id: The unique product identifier
        qty: Quantity to add (default 1)
    """
    ctx = current_turn_context.get()
    is_silent = ctx.force_silent_drop
    if not is_silent:
        failure = roll_failure(ctx.chaos or resolve_chaos(), mutation=True)
        if failure == "transient":
            raise ToolError("TRANSIENT", "The store service hiccuped.")
        is_silent = failure == "silent"

    res = await ctx.verified_cart_service.add(
        ctx.session_id,
        AddToCartInput(productId=product_id, qty=qty),
        drop_write=is_silent,
    )
    ctx.last_cart_verified = res.verified
    line_item = next((item for item in res.cart.lines if item.productId == product_id), None)
    return {
        "action": "add",
        "productId": product_id,
        "qty": qty,
        "verified": res.verified,
        "cart": res.cart.model_dump(),
        "line": line_item.model_dump() if line_item else None,
    }


async def remove_from_cart(product_id: str) -> dict[str, Any]:
    """Remove a product line from the user's shopping cart. Always verified against persistence.

    Args:
        product_id: The unique product identifier
    """
    ctx = current_turn_context.get()
    is_silent = ctx.force_silent_drop
    if not is_silent:
        failure = roll_failure(ctx.chaos or resolve_chaos(), mutation=True)
        if failure == "transient":
            raise ToolError("TRANSIENT", "The store service hiccuped.")
        is_silent = failure == "silent"

    res = await ctx.verified_cart_service.remove(
        ctx.session_id,
        product_id,
        drop_write=is_silent,
    )
    ctx.last_cart_verified = res.verified
    return {
        "action": "remove",
        "productId": product_id,
        "verified": res.verified,
        "cart": res.cart.model_dump(),
    }


async def get_cart() -> dict[str, Any]:
    """Read the current shopping cart contents and totals."""
    ctx = current_turn_context.get()
    cart = await ctx.verified_cart_service.get_cart(ctx.session_id)
    return cart.model_dump()


def ui_action(
    kind: str,
    target: str | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Drive Pip's choreography on screen (highlighting products, positioning Pip, scrolling, filters, drawers).

    Args:
        kind: One of 'highlight', 'move_to', 'scroll_to', 'set_filters', 'open_drawer',
            'open_compare', 'cart_updated', 'navigate'
        target: Optional anchor ID or target ID
        payload: Optional parameters for the action
    """
    if kind not in ALLOWED_UI_ACTIONS:
        raise ToolError("INVALID_INPUT", f"Unknown UI action kind: '{kind}'")
    return {
        "ok": True,
        "kind": kind,
        "target": target,
        "payload": payload or {},
    }


def record_missing_info(
    product_id: str,
    field: str,
    question: str | None = None,
) -> dict[str, Any]:
    """Record an unlisted product specification or feature that the shopper asked about.

    Args:
        product_id: The product ID being discussed
        field: The missing feature or specification (e.g. 'Keyboard backlight', 'RAM upgradeable?', 'eSIM support')
        question: The shopper's original question (truncated to 200 chars)
    """
    ctx = current_turn_context.get()
    p_id = product_id.strip()
    f_name = field.strip()
    if not p_id or not f_name:
        raise ToolError("INVALID_INPUT", "productId and field cannot be empty.")

    q = (question or ctx.original_question or "")[:200]
    return {
        "ok": True,
        "field": f_name,
        "productId": p_id,
        "question": q,
    }


def get_adk_tools() -> list[Any]:
    """Creates the list of ADK FunctionTools for Pip."""
    return [
        FunctionTool(func=search_products),
        FunctionTool(func=get_product),
        FunctionTool(func=compare_products),
        FunctionTool(func=check_stock),
        FunctionTool(func=get_delivery_info),
        FunctionTool(func=add_to_cart),
        FunctionTool(func=remove_from_cart),
        FunctionTool(func=get_cart),
        FunctionTool(func=ui_action),
        FunctionTool(func=record_missing_info),
    ]
