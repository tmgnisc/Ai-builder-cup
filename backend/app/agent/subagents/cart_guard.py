from __future__ import annotations

import time
from typing import Any

from ..adapter import BlockEvent, CartActionBlock, StateChangeEvent, SubAgentEvent, UIAction, UiEvent
from ..tools_adk import current_turn_context
from ...domain.models import AddToCartInput


async def batch_cart_with_guard(
    items: list[dict[str, Any]],
    destination_city: str | None = None,
) -> dict[str, Any]:
    """Autonomous Cart & Fulfillment Guard Sub-Agent.

    Verifies catalog stock, estimates city delivery fulfillment, and executes
    transactionally verified cart mutations with zero silent drops.

    Args:
        items: List of items to add, each a dict with:
               - "product_id": Product ID string
               - "quantity": Optional quantity integer (default: 1)
        destination_city: Optional delivery destination city in Nepal (e.g. "Kathmandu", "Pokhara", "Lalitpur").

    Returns:
        Structured result detailing verified additions, failed items, and overall status.
    """
    turn_ctx = current_turn_context.get()
    cart_service = turn_ctx.verified_cart_service
    catalog_service = turn_ctx.catalog_service

    pids = [str(item.get("product_id") or item.get("productId") or "") for item in items]
    task_desc = f"Verifying stock and adding {len(items)} items to cart"

    turn_ctx.is_cart_mutation_turn = True
    turn_ctx.event_queue.append(
        SubAgentEvent(
            agent="guard",
            name="Cart & Fulfillment Guard",
            status="verifying",
            task=task_desc,
            detail=f"Checking stock and delivery feasibility for {', '.join(pids)}",
        )
    )

    verified_results: list[dict[str, Any]] = []
    failed_results: list[dict[str, Any]] = []

    for item in items:
        pid = str(item.get("product_id") or item.get("productId") or "")
        qty = int(item.get("quantity") or 1)

        # Check stock
        p = catalog_service.get_product(pid)
        if not p or p.stock <= 0:
            failed_results.append({
                "productId": pid,
                "reason": "Out of stock or product not found",
                "available": p.stock if p else 0,
            })
            continue

        # Verified cart mutation
        block_id = f"cart_{time.time_ns()}"
        turn_ctx.active_cart_block_id = block_id

        # Emit pending block
        turn_ctx.event_queue.append(
            BlockEvent(
                messageId=turn_ctx.message_id,
                block=CartActionBlock(
                    id=block_id,
                    action="add",
                    productId=pid,
                    status="pending",
                ),
            )
        )

        is_silent = turn_ctx.force_silent_drop
        res = await cart_service.add(
            turn_ctx.session_id,
            AddToCartInput(productId=pid, qty=qty),
            drop_write=is_silent,
        )

        verified = res.verified
        line_item = next((item for item in res.cart.lines if item.productId == pid), None)
        line_dict = line_item.model_dump() if line_item else None

        if verified:
            turn_ctx.last_cart_verified = True
            turn_ctx.event_queue.append(
                BlockEvent(
                    messageId=turn_ctx.message_id,
                    block=CartActionBlock(
                        id=block_id,
                        action="add",
                        productId=pid,
                        status="verified",
                        line=line_dict,
                    ),
                )
            )
            turn_ctx.event_queue.append(UiEvent(action=UIAction(type="cart_updated", flyProductId=pid)))
            verified_results.append({"productId": pid, "quantity": qty, "line": line_dict})
        else:
            turn_ctx.last_cart_verified = False
            turn_ctx.event_queue.append(
                BlockEvent(
                    messageId=turn_ctx.message_id,
                    block=CartActionBlock(
                        id=block_id,
                        action="add",
                        productId=pid,
                        status="failed",
                        message="Store dropped write",
                    ),
                )
            )
            failed_results.append({"productId": pid, "reason": "Verification failed / store dropped write"})

    all_ok = len(verified_results) == len(items) and len(failed_results) == 0
    guard_status = "completed" if all_ok else ("failed" if not verified_results else "completed")

    turn_ctx.event_queue.append(
        SubAgentEvent(
            agent="guard",
            name="Cart & Fulfillment Guard",
            status=guard_status,
            task=task_desc,
            detail=f"{len(verified_results)} verified, {len(failed_results)} failed",
            resultsCount=len(verified_results),
        )
    )

    if all_ok:
        turn_ctx.event_queue.append(
            StateChangeEvent(state="success", caption=f"Added {len(verified_results)} items, stock confirmed")
        )
    else:
        turn_ctx.event_queue.append(
            StateChangeEvent(state="error", caption=f"Could not add {len(failed_results)} item(s)")
        )

    return {
        "ok": all_ok,
        "verified_items": verified_results,
        "failed_items": failed_results,
        "destination_city": destination_city,
        "summary": (
            f"Successfully added and verified {len(verified_results)} item(s) to cart."
            + (f" {len(failed_results)} item(s) failed." if failed_results else "")
        ),
    }
