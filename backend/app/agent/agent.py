import logging
import re
import time
from typing import Any, Literal

from google.adk.agents import LlmAgent
from google.adk.agents.context import Context
from google.adk.models import BaseLlm
from google.adk.planners import BuiltInPlanner
from google.adk.tools.base_tool import BaseTool
from google.genai import types
from pydantic import ValidationError

from ..core.errors import ToolError
from .adapter import (
    BlockEvent,
    CartActionBlock,
    ComparisonBlock,
    MissingInfoEvent,
    ProductCarouselBlock,
    StateChangeEvent,
    ToolCallEvent,
    ToolErrorDetail,
    ToolResultEvent,
    UIAction,
    UiEvent,
)
from .prompts import PIP_SYSTEM_INSTRUCTION
from .tools_adk import (
    ALLOWED_TOOLS,
    current_turn_context,
    get_adk_tools,
)

logger = logging.getLogger(__name__)
_SNAKE = re.compile(r"_([a-z])")


def ui_action_from(kind: str, target: str | None, payload: dict[str, Any]) -> UIAction | None:
    """Builds a UIAction from a model's ui_action call, tolerating snake_case keys (max_price → maxPrice).

    Unknown keys are dropped, and an action that still doesn't validate is skipped: UI choreography is
    cosmetic and must never abort the shopper's answer.
    """
    args: dict[str, Any] = {"type": kind}
    if target:
        args["anchorId"] = target
    for key, value in payload.items():
        args[_SNAKE.sub(lambda m: m.group(1).upper(), key)] = value
    known = {k: v for k, v in args.items() if k in UIAction.model_fields}
    try:
        return UIAction(**known)
    except ValidationError as err:
        logger.warning("Skipping invalid ui_action %s: %s", kind, err.errors()[:1])
        return None


def create_pip_agent(model: str | BaseLlm) -> LlmAgent:
    """Builds the Pip LlmAgent with code guardrails, tool allowlisting, and callbacks."""

    async def before_tool_callback(tool: BaseTool, args: dict[str, Any], context: Context) -> dict[str, Any] | None:
        turn_ctx = current_turn_context.get()

        # 1. Allowlist enforcement
        if tool.name not in ALLOWED_TOOLS:
            err = {"code": "FORBIDDEN", "message": f"Tool '{tool.name}' is not in the allowlist."}
            turn_ctx.event_queue.append(StateChangeEvent(state="error", caption="Action not permitted"))
            return {"error": err}

        # 2. Tool-call cap (max 8 calls per turn)
        if turn_ctx.tool_call_count >= 8:
            err = {"code": "TOOL_LIMIT_EXCEEDED", "message": "Turn tool call limit reached (max 8 calls)."}
            turn_ctx.event_queue.append(StateChangeEvent(state="error", caption="Too many tool calls"))
            return {"error": err}

        turn_ctx.tool_call_count += 1
        call_id = f"call_{time.time_ns()}"
        turn_ctx.pending_tool_starts[tool.name] = time.monotonic()
        turn_ctx.pending_tool_starts[f"{tool.name}_call_id"] = call_id  # type: ignore[assignment]

        # 3. Pip state change mapping
        if tool.name in ("search_products", "scout_multiple_products"):
            caption = "Scouting multiple products…" if tool.name == "scout_multiple_products" else "Searching products…"
            turn_ctx.event_queue.append(StateChangeEvent(state="searching", caption=caption))
        elif tool.name in ("compare_products", "analyze_comparison"):
            caption = "Analyzing comparison…" if tool.name == "analyze_comparison" else "Comparing products…"
            turn_ctx.event_queue.append(StateChangeEvent(state="comparing", caption=caption))
        elif tool.name in ("add_to_cart", "remove_from_cart", "batch_cart_with_guard"):
            turn_ctx.is_cart_mutation_turn = True
            caption = "Verifying & adding to cart…" if tool.name == "batch_cart_with_guard" else "Updating cart…"
            turn_ctx.event_queue.append(StateChangeEvent(state="acting", caption=caption))
        elif tool.name == "ui_action":
            turn_ctx.event_queue.append(StateChangeEvent(state="presenting", caption="Here's what I found"))
        else:
            turn_ctx.event_queue.append(StateChangeEvent(state="thinking", caption="Thinking…"))

        # 4. Emit tool_call event
        turn_ctx.event_queue.append(
            ToolCallEvent(
                messageId=turn_ctx.message_id,
                callId=call_id,
                name=tool.name,
                input=args,
            )
        )

        # 5. Pending cart action block
        if tool.name in ("add_to_cart", "remove_from_cart"):
            pid = str(args.get("product_id") or args.get("productId") or "")
            action: Literal["add", "remove"] = "add" if tool.name == "add_to_cart" else "remove"
            block_id = f"cart_{time.time_ns()}"
            turn_ctx.active_cart_block_id = block_id
            turn_ctx.event_queue.append(
                BlockEvent(
                    messageId=turn_ctx.message_id,
                    block=CartActionBlock(
                        id=block_id,
                        action=action,
                        productId=pid,
                        status="pending",
                    ),
                )
            )

        return None

    async def after_tool_callback(
        tool: BaseTool, args: dict[str, Any], context: Context, result: dict[str, Any]
    ) -> dict[str, Any] | None:
        turn_ctx = current_turn_context.get()
        start = turn_ctx.pending_tool_starts.pop(tool.name, time.monotonic())
        call_id = str(turn_ctx.pending_tool_starts.pop(f"{tool.name}_call_id", f"call_{time.time_ns()}"))
        duration_ms = max(1, int((time.monotonic() - start) * 1000))

        # If tool encountered an error, on_tool_error_callback has already handled it
        if "error" in result:
            return None

        if tool.name in ("add_to_cart", "remove_from_cart"):
            verified = bool(result.get("verified", False))
            turn_ctx.last_cart_verified = verified
            pid = str(args.get("product_id") or args.get("productId") or "")
            action: Literal["add", "remove"] = "add" if tool.name == "add_to_cart" else "remove"
            block_id = turn_ctx.active_cart_block_id or f"cart_{time.time_ns()}"

            if verified:
                summary = "verified ✓ · store accepted"
                turn_ctx.event_queue.append(StateChangeEvent(state="success", caption="Added to cart, stock confirmed"))
                turn_ctx.event_queue.append(
                    BlockEvent(
                        messageId=turn_ctx.message_id,
                        block=CartActionBlock(
                            id=block_id,
                            action=action,
                            productId=pid,
                            status="verified",
                            line=result.get("line"),
                        ),
                    )
                )
                turn_ctx.event_queue.append(UiEvent(action=UIAction(type="cart_updated", flyProductId=pid)))
            else:
                summary = "NOT verified ✕ · store dropped write"
                turn_ctx.event_queue.append(StateChangeEvent(state="error", caption="Couldn't verify"))
                turn_ctx.event_queue.append(
                    BlockEvent(
                        messageId=turn_ctx.message_id,
                        block=CartActionBlock(
                            id=block_id,
                            action=action,
                            productId=pid,
                            status="failed",
                            message="Store dropped write",
                        ),
                    )
                )

            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
            turn_ctx.memory.focusProductId = pid

        elif tool.name == "search_products":
            total = result.get("total", 0)
            searched = result.get("searched", 0)
            summary = f"{total} result{'s' if total != 1 else ''} of {searched}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
            prods = result.get("products", [])
            if prods:
                pids = [p["id"] for p in prods]
                turn_ctx.event_queue.append(
                    BlockEvent(
                        messageId=turn_ctx.message_id,
                        block=ProductCarouselBlock(
                            id=f"carousel_{time.time_ns()}",
                            productIds=pids,
                            title="Matching products",
                        ),
                    )
                )
                turn_ctx.event_queue.append(UiEvent(action=UIAction(type="highlight", productIds=pids)))
                turn_ctx.memory.lastResultIds = pids

        elif tool.name == "compare_products":
            pids = result.get("productIds", [])
            winner = result.get("winnerId")
            summary = f"{len(pids)} products · {'winner found' if winner else 'close call'}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
            turn_ctx.event_queue.append(
                BlockEvent(
                    messageId=turn_ctx.message_id,
                    block=ComparisonBlock(
                        id=f"cmp_{time.time_ns()}",
                        productIds=pids,
                        verdict=result.get("verdict", ""),
                        winnerId=winner,
                    ),
                )
            )
            turn_ctx.event_queue.append(UiEvent(action=UIAction(type="open_compare", productIds=pids)))
            turn_ctx.memory.lastComparedIds = pids

        elif tool.name == "check_stock":
            in_stock = bool(result.get("inStock", False))
            qty = result.get("quantity", 0)
            summary = f"in stock ({qty})" if in_stock else "out of stock"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
            pid = str(result.get("productId") or "")
            turn_ctx.memory.focusProductId = pid
            if not in_stock:
                turn_ctx.event_queue.append(StateChangeEvent(state="error", caption="Out of stock"))

        elif tool.name == "get_delivery_info":
            summary = f"{result.get('city')} · {result.get('days')}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )

        elif tool.name == "get_product":
            summary = f"{result.get('brand')} {result.get('name')}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
            turn_ctx.memory.focusProductId = result.get("id")

        elif tool.name == "ui_action":
            kind = result.get("kind", "")
            summary = f"UI: {kind}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
            ui = ui_action_from(kind, result.get("target"), result.get("payload") or {})
            if ui is not None:
                turn_ctx.event_queue.append(UiEvent(action=ui))

        elif tool.name == "record_missing_info":
            field_name = result.get("field", "")
            pid = result.get("productId", "")
            summary = f"Missing: {field_name} on {pid}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
            turn_ctx.event_queue.append(
                MissingInfoEvent(
                    field=field_name,
                    productId=pid,
                    question=result.get("question"),
                )
            )

        elif tool.name == "get_cart":
            count = len(result.get("lines", []))
            summary = f"{count} item{'s' if count != 1 else ''}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )
        elif tool.name == "scout_multiple_products":
            total = result.get("total_products", 0)
            bundle = result.get("bundle", {})
            summary = f"Scouted {total} items · Package: NPR {bundle.get('total_price_npr', 0):,.0f}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )

        elif tool.name == "analyze_comparison":
            pids = result.get("productIds", [])
            winner = result.get("winnerId")
            summary = f"{len(pids)} products · {'winner found' if winner else 'close call'}"
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=True,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )

        elif tool.name == "batch_cart_with_guard":
            ok = bool(result.get("ok", False))
            verified_count = len(result.get("verified_items", []))
            failed_count = len(result.get("failed_items", []))
            summary = f"{verified_count} verified ✓" + (f" · {failed_count} failed" if failed_count else "")
            turn_ctx.event_queue.append(
                ToolResultEvent(
                    messageId=turn_ctx.message_id,
                    callId=call_id,
                    name=tool.name,
                    ok=ok,
                    summary=summary,
                    durationMs=duration_ms,
                )
            )

        return None

    async def on_tool_error_callback(
        tool: BaseTool, args: dict[str, Any], context: Context, error: Exception
    ) -> dict[str, Any] | None:
        turn_ctx = current_turn_context.get()
        start = turn_ctx.pending_tool_starts.pop(tool.name, time.monotonic())
        call_id = str(turn_ctx.pending_tool_starts.pop(f"{tool.name}_call_id", f"call_{time.time_ns()}"))
        duration_ms = max(1, int((time.monotonic() - start) * 1000))

        # Retry logic: retry only read tools on TRANSIENT error once
        is_read_tool = tool.name not in ("add_to_cart", "remove_from_cart")
        if is_read_tool and isinstance(error, ToolError) and error.code == "TRANSIENT":
            try:
                # 1 retry
                retry_res = await tool.run_async(args=args, tool_context=context)
                if isinstance(retry_res, dict):
                    await after_tool_callback(tool, args, context, retry_res)
                    return retry_res
            except Exception:
                pass

        code = getattr(error, "code", "TOOL_ERROR")
        msg = str(error)
        turn_ctx.event_queue.append(
            ToolResultEvent(
                messageId=turn_ctx.message_id,
                callId=call_id,
                name=tool.name,
                ok=False,
                summary=msg,
                durationMs=duration_ms,
                error=ToolErrorDetail(code=code, message=msg),
            )
        )
        turn_ctx.event_queue.append(StateChangeEvent(state="error", caption=msg))

        if tool.name in ("add_to_cart", "remove_from_cart"):
            pid = str(args.get("product_id") or args.get("productId") or "")
            action: Literal["add", "remove"] = "add" if tool.name == "add_to_cart" else "remove"
            block_id = turn_ctx.active_cart_block_id or f"cart_{time.time_ns()}"
            turn_ctx.event_queue.append(
                BlockEvent(
                    messageId=turn_ctx.message_id,
                    block=CartActionBlock(
                        id=block_id,
                        action=action,
                        productId=pid,
                        status="failed",
                        message=msg,
                    ),
                )
            )

        return {"error": {"code": code, "message": msg}}

    planner = None
    if isinstance(model, str):
        try:
            planner = BuiltInPlanner(thinking_config=types.ThinkingConfig(thinking_budget=0))
        except Exception:
            planner = None

    agent_kwargs: dict[str, Any] = {
        "name": "pip",
        "model": model,
        "instruction": PIP_SYSTEM_INSTRUCTION,
        "tools": get_adk_tools(),
        "before_tool_callback": before_tool_callback,
        "after_tool_callback": after_tool_callback,
        "on_tool_error_callback": on_tool_error_callback,
    }
    if planner is not None:
        agent_kwargs["planner"] = planner

    return LlmAgent(**agent_kwargs)
