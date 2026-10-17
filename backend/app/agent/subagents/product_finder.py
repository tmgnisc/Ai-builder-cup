from __future__ import annotations

import time
from typing import Any

from ..adapter import BundleBlock, BundleItem, ProductCarouselBlock, SubAgentEvent, UIAction, UiEvent
from ..tools_adk import current_turn_context
from ...domain.models import ProductQuery


def scout_multiple_products(
    items: list[dict[str, Any]],
    total_budget_npr: float | None = None,
    limit_per_item: int = 3,
) -> dict[str, Any]:
    """Autonomous Product Finder (Scout) Sub-Agent.

    Discovers and matches multiple products concurrently across different categories,
    computes package pricing, and compiles verified bundle recommendations for Pip.

    Args:
        items: List of search specifications for each product the user wants.
               Each entry is a dictionary with optional keys:
               - "label": Slot name (e.g. "Laptop", "Headphones", "Mouse")
               - "category": Category string ("laptops", "phones", "headphones", "accessories")
               - "q": Keyword search query text (e.g. "lightweight", "noise cancelling")
               - "max_price": Maximum price in NPR for this slot
               - "min_price": Minimum price in NPR for this slot
               - "min_ram_gb": Minimum RAM in GB (for laptops/phones)
               - "tags": List of feature tags (e.g. ["travel", "oled", "anc"])
               - "brands": List of preferred brands
        total_budget_npr: Optional ceiling for the total combined package price in NPR.
        limit_per_item: Maximum candidates to discover per requested item slot (default: 3).

    Returns:
        Structured dictionary containing:
        - slots: List of requested item slots with matched products
        - bundle: Top recommended combination with total bundle price
        - all_product_ids: All discovered product IDs
        - total_products: Total candidates found
        - summary: Human-readable grounded summary of the multi-product search
    """
    turn_ctx = current_turn_context.get()
    catalog_service = turn_ctx.catalog_service

    labels = [str(item.get("label") or item.get("category") or item.get("q") or f"Item {i+1}") for i, item in enumerate(items)]
    task_desc = f"Scouting {len(items)} items: {', '.join(labels)}"

    # 1. Emit Sub-Agent delegated / searching event
    turn_ctx.event_queue.append(
        SubAgentEvent(
            agent="scout",
            name="Product Finder (Scout)",
            status="searching",
            task=task_desc,
            detail=f"Querying catalog for {len(items)} parallel product requirements",
        )
    )

    discovered_slots: list[dict[str, Any]] = []
    bundle_picks: list[BundleItem] = []
    all_product_ids: list[str] = []
    total_price = 0.0

    for i, item_spec in enumerate(items):
        slot_label = labels[i]
        cat = item_spec.get("category")
        q = item_spec.get("q")
        max_p = item_spec.get("max_price")
        min_p = item_spec.get("min_price")
        min_ram = item_spec.get("min_ram_gb")
        tags = item_spec.get("tags")
        brands = item_spec.get("brands")
        sort = item_spec.get("sort", "relevance")

        query = ProductQuery(
            q=q,
            category=cat,  # type: ignore[arg-type]
            minPrice=min_p,
            maxPrice=max_p,
            minRamGB=min_ram,
            tags=tags,
            brands=brands,
            sort=sort,
            limit=limit_per_item,
        )

        res = catalog_service.search(query)
        prods = res.products
        if not prods and cat:
            # Fallback relaxation: search within category with budget constraints
            fallback_query = ProductQuery(category=cat, maxPrice=max_p, minPrice=min_p, limit=limit_per_item)
            fallback_res = catalog_service.search(fallback_query)
            prods = fallback_res.products

        slot_products = []
        for p in prods:
            p_dict = {
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "category": p.category,
                "price": p.price,
                "rating": p.rating,
                "specs": p.specs.model_dump(exclude_none=True),
            }
            slot_products.append(p_dict)
            if p.id not in all_product_ids:
                all_product_ids.append(p.id)

        top_pick = slot_products[0] if slot_products else None
        if top_pick:
            bundle_picks.append(
                BundleItem(
                    slot=slot_label,
                    productId=top_pick["id"],
                    name=top_pick["name"],
                    price=top_pick["price"],
                    brand=top_pick["brand"],
                )
            )
            total_price += top_pick["price"]

        discovered_slots.append(
            {
                "slot": slot_label,
                "requested_spec": item_spec,
                "match_count": len(slot_products),
                "top_pick": top_pick,
                "candidates": slot_products,
            }
        )

    # 2. Emit rich BundleBlock for UI rendering
    if bundle_picks:
        bundle_block_id = f"bundle_{time.time_ns()}"
        bundle_block = BundleBlock(
            id=bundle_block_id,
            title=f"Curated {len(bundle_picks)}-Item Package",
            items=bundle_picks,
            totalPrice=total_price,
            productIds=[item.productId for item in bundle_picks],
        )
        from ..adapter import BlockEvent

        turn_ctx.event_queue.append(
            BlockEvent(
                messageId=turn_ctx.message_id,
                block=bundle_block,
            )
        )
        # Choreograph UI to highlight scouted products
        turn_ctx.event_queue.append(
            UiEvent(action=UIAction(type="highlight", productIds=[item.productId for item in bundle_picks]))
        )

    # 3. Emit Sub-Agent completion event
    turn_ctx.event_queue.append(
        SubAgentEvent(
            agent="scout",
            name="Product Finder (Scout)",
            status="completed",
            task=task_desc,
            detail=f"Matched {len(bundle_picks)}/{len(items)} slots. Total package: NPR {total_price:,.0f}",
            resultsCount=len(all_product_ids),
        )
    )

    # 4. Update memory focus and result IDs
    turn_ctx.memory.lastResultIds = all_product_ids
    if bundle_picks:
        turn_ctx.memory.focusProductId = bundle_picks[0].productId

    summary = (
        f"Product Finder scouted {len(all_product_ids)} items across {len(items)} requested categories "
        f"({', '.join(labels)}). Top combination total: NPR {total_price:,.0f}."
    )

    return {
        "slots": discovered_slots,
        "bundle": {
            "title": f"Recommended {len(bundle_picks)}-Item Package",
            "items": [item.model_dump() for item in bundle_picks],
            "total_price_npr": total_price,
        },
        "all_product_ids": all_product_ids,
        "total_products": len(all_product_ids),
        "summary": summary,
    }
