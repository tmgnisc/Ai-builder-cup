from __future__ import annotations

import time
from typing import Any

from ..adapter import BlockEvent, ComparisonBlock, SubAgentEvent, UIAction, UiEvent
from ..tools_adk import current_turn_context
from ...domain.compare import compare_products as domain_compare_products


def analyze_comparison(
    product_ids: list[str],
    priorities: list[str] | None = None,
    context: str | None = None,
) -> dict[str, Any]:
    """Autonomous Comparison Analyst Sub-Agent.

    Conducts deep side-by-side technical specification analysis, evaluates hardware trade-offs,
    and identifies the clear winner or optimal choice based on user priorities.

    Args:
        product_ids: List of 2 to 4 product IDs to evaluate.
        priorities: Optional list of prioritized dimensions (e.g. ["battery", "ram", "price", "weight"]).
        context: Optional user context (e.g. "college student", "software engineering", "travel").

    Returns:
        Structured evaluation matrix including winner, dimension scores, and trade-off summary.
    """
    turn_ctx = current_turn_context.get()
    catalog_service = turn_ctx.catalog_service

    task_desc = f"Comparing {len(product_ids)} products: {', '.join(product_ids)}"

    turn_ctx.event_queue.append(
        SubAgentEvent(
            agent="analyst",
            name="Comparison Analyst",
            status="analyzing",
            task=task_desc,
            detail=f"Evaluating specs and trade-offs across {len(product_ids)} items",
        )
    )

    from ...core.errors import ToolError

    products = []
    for pid in product_ids:
        p = catalog_service.get_product(pid)
        if not p:
            raise ToolError("NOT_FOUND", f'No product with id "{pid}".')
        products.append(p)

    r = catalog_service.compare(products, priorities, context)  # type: ignore[arg-type]
    cmp_block_id = f"cmp_{time.time_ns()}"
    pids = r.productIds
    winner = r.winnerId
    verdict = r.verdict

    # Emit ComparisonBlock
    turn_ctx.event_queue.append(
        BlockEvent(
            messageId=turn_ctx.message_id,
            block=ComparisonBlock(
                id=cmp_block_id,
                productIds=pids,
                verdict=verdict,
                winnerId=winner,
                context=context,
                priorities=priorities,  # type: ignore[arg-type]
            ),
        )
    )

    # Open comparison drawer in UI
    turn_ctx.event_queue.append(
        UiEvent(action=UIAction(type="open_compare", productIds=pids, context=context, priorities=priorities))  # type: ignore[arg-type]
    )

    # Update memory
    turn_ctx.memory.lastComparedIds = pids
    if winner:
        turn_ctx.memory.focusProductId = winner

    turn_ctx.event_queue.append(
        SubAgentEvent(
            agent="analyst",
            name="Comparison Analyst",
            status="completed",
            task=task_desc,
            detail=f"Verdict: {'Winner identified' if winner else 'Close call'} · {verdict[:80]}…",
            resultsCount=len(pids),
        )
    )

    return {
        "productIds": r.productIds,
        "winnerId": r.winnerId,
        "verdict": r.verdict,
        "advantages": r.advantages,
    }
