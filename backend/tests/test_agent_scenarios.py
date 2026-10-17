import json
from typing import Any

import pytest
from google.genai import types

from app.agent.adapter import (
    AgentMemory,
    AgentRequest,
)
from app.agent.agent import create_pip_agent
from app.agent.runner import InMemorySessionProvider, run_pip_stream
from app.agent.tools_adk import AgentTurnContext
from app.domain.chaos import resolve_chaos
from app.repositories.cart import InMemoryCartRepository
from app.services.catalog import CatalogService
from app.services.verified_cart import VerifiedCartService
from tests.scripted_llm import ScriptedLlm


async def collect_events(
    request: AgentRequest,
    llm: ScriptedLlm,
    chaos: str | None = None,
    session_id: str = "sess_test",
) -> list[dict[str, Any]]:
    catalog = CatalogService()
    repo = InMemoryCartRepository()
    cart_service = VerifiedCartService(repository=repo, catalog=catalog)
    turn_ctx = AgentTurnContext(
        session_id=session_id,
        catalog_service=catalog,
        verified_cart_service=cart_service,
        chaos=resolve_chaos(chaos_param=chaos) if chaos and chaos != "silent" else None,
        force_silent_drop=(chaos == "silent"),
    )
    agent = create_pip_agent(model=llm)
    lines: list[str] = []
    async for line in run_pip_stream(
        request=request,
        turn_ctx=turn_ctx,
        agent=agent,
        session_provider=InMemorySessionProvider(),
    ):
        lines.append(line)
    return [json.loads(line) for line in lines]


@pytest.mark.asyncio
async def test_scenario_1_laptop_search() -> None:
    """Scenario 1: Laptop search by budget and RAM."""
    llm = ScriptedLlm(
        turns=[
            [
                [
                    types.Part.from_function_call(
                        name="search_products",
                        args={"category": "laptops", "max_price": 120000, "min_ram_gb": 16},
                    )
                ],
                [types.Part.from_text(text="I found great laptops under NPR 120,000 with 16GB RAM.")],
            ]
        ]
    )
    events = await collect_events(
        AgentRequest(message="Looking for laptops under 120k with 16 GB RAM"),
        llm,
    )

    types_list = [e["type"] for e in events]
    assert "state_change" in types_list
    assert "tool_call" in types_list
    assert "tool_result" in types_list
    assert "block" in types_list
    assert "ui" in types_list
    assert "message_start" in types_list
    assert "text_delta" in types_list
    assert "memory" in types_list
    assert events[-1]["type"] == "done"

    # Verify block is product_carousel
    carousel = next(e["block"] for e in events if e["type"] == "block")
    assert carousel["kind"] == "product_carousel"
    assert len(carousel["productIds"]) > 0

    # Verify memory recorded lastResultIds
    mem = next(e["memory"] for e in events if e["type"] == "memory")
    assert len(mem["lastResultIds"]) > 0


@pytest.mark.asyncio
async def test_scenario_2_compare_products() -> None:
    """Scenario 2: Compare the first two laptops."""
    pids = ["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="compare_products", args={"product_ids": pids})],
                [types.Part.from_text(text="Comparing the IdeaPad and Swift Go: both offer great value.")],
            ]
        ]
    )
    req = AgentRequest(
        message="Compare the first two",
        memory=AgentMemory(lastResultIds=pids),
    )
    events = await collect_events(req, llm)

    cmp_block = next(e["block"] for e in events if e["type"] == "block" and e["block"]["kind"] == "comparison")
    assert cmp_block["kind"] == "comparison"
    assert cmp_block["productIds"] == pids
    assert cmp_block["verdict"] != ""


@pytest.mark.asyncio
async def test_scenario_3_add_lighter_one_verified() -> None:
    """Scenario 3: Add lighter one (verified)."""
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="add_to_cart", args={"product_id": "acer-swift-go-14", "qty": 1})],
                [types.Part.from_text(text="Added the Swift Go 14 to your cart.")],
            ]
        ]
    )
    events = await collect_events(
        AgentRequest(message="Add the lighter one"),
        llm,
    )

    # Must contain pending then verified cart_action block
    cart_blocks = [e["block"] for e in events if e["type"] == "block" and e["block"]["kind"] == "cart_action"]
    assert len(cart_blocks) == 2
    assert cart_blocks[0]["status"] == "pending"
    assert cart_blocks[1]["status"] == "verified"

    # Must have cart_updated UI action
    ui_actions = [e["action"] for e in events if e["type"] == "ui"]
    assert any(a["type"] == "cart_updated" and a.get("flyProductId") == "acer-swift-go-14" for a in ui_actions)

    # Success state change
    states = [e["state"] for e in events if e["type"] == "state_change"]
    assert "success" in states


@pytest.mark.asyncio
async def test_scenario_4_out_of_stock_honest_failure() -> None:
    """Scenario 4: Add out-of-stock ThinkPad E14."""
    llm = ScriptedLlm(
        turns=[
            [
                [
                    types.Part.from_function_call(
                        name="add_to_cart", args={"product_id": "lenovo-thinkpad-e14-g6", "qty": 1}
                    )
                ],
                [
                    types.Part.from_text(
                        text="The ThinkPad E14 is currently out of stock. How about the IdeaPad Slim 5 instead?"
                    )
                ],
            ]
        ]
    )
    events = await collect_events(
        AgentRequest(message="Add the ThinkPad E14"),
        llm,
    )

    cart_blocks = [e["block"] for e in events if e["type"] == "block" and e["block"]["kind"] == "cart_action"]
    assert len(cart_blocks) == 2
    assert cart_blocks[0]["status"] == "pending"
    assert cart_blocks[1]["status"] == "failed"
    assert "out of stock" in cart_blocks[1]["message"].lower()

    # Tool result ok=False
    results = [e for e in events if e["type"] == "tool_result" and e["name"] == "add_to_cart"]
    assert len(results) == 1
    assert results[0]["ok"] is False


@pytest.mark.asyncio
async def test_scenario_5_silent_chaos_drop_guardrail() -> None:
    """Scenario 5: Silent chaos drop reports verified=false and honest reply."""
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="add_to_cart", args={"product_id": "acer-swift-go-14", "qty": 1})],
                # Model claims success:
                [types.Part.from_text(text="Added to cart successfully!")],
            ]
        ]
    )
    events = await collect_events(
        AgentRequest(message="Add Swift Go 14"),
        llm,
        chaos="silent",
    )

    cart_blocks = [e["block"] for e in events if e["type"] == "block" and e["block"]["kind"] == "cart_action"]
    assert len(cart_blocks) == 2
    assert cart_blocks[0]["status"] == "pending"
    assert cart_blocks[1]["status"] == "failed"

    # State was set to error, never success
    states = [e["state"] for e in events if e["type"] == "state_change"]
    assert "success" not in states

    # Guardrail suppressed false success claim and emitted honest status
    deltas = "".join(e["delta"] for e in events if e["type"] == "text_delta")
    assert "couldn't verify" in deltas.lower() or "could not verify" in deltas.lower()
    assert "successfully" not in deltas.lower()


@pytest.mark.asyncio
async def test_scenario_6_missing_info_event() -> None:
    """Scenario 6: Unknown fact emits missing_info event."""
    llm = ScriptedLlm(
        turns=[
            [
                [
                    types.Part.from_function_call(
                        name="record_missing_info",
                        args={
                            "product_id": "lenovo-ideapad-slim-5-14",
                            "field": "Keyboard backlight",
                            "question": "Does it have a backlit keyboard?",
                        },
                    )
                ],
                [
                    types.Part.from_text(
                        text="The catalog does not mention if the IdeaPad Slim 5 has a backlit keyboard."
                    )
                ],
            ]
        ]
    )
    events = await collect_events(
        AgentRequest(message="Does the IdeaPad Slim 5 have a backlit keyboard?"),
        llm,
    )

    missing_events = [e for e in events if e["type"] == "missing_info"]
    assert len(missing_events) == 1
    assert missing_events[0]["field"] == "Keyboard backlight"
    assert missing_events[0]["productId"] == "lenovo-ideapad-slim-5-14"
    assert "backlit" in missing_events[0]["question"]


@pytest.mark.asyncio
async def test_scenario_7_invalid_tool_args() -> None:
    """Scenario 7: Invalid tool args handled gracefully."""
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="ui_action", args={"kind": "invalid_kind_123"})],
                [types.Part.from_text(text="I encountered an issue with that action.")],
            ]
        ]
    )
    events = await collect_events(
        AgentRequest(message="Do unknown action"),
        llm,
    )

    # Tool result ok=False
    tool_results = [e for e in events if e["type"] == "tool_result"]
    assert len(tool_results) == 1
    assert tool_results[0]["ok"] is False
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_scenario_8_tool_call_cap() -> None:
    """Scenario 8: Cap tool calls per turn (stops at 8)."""
    # 9 consecutive tool calls
    steps = [
        [types.Part.from_function_call(name="check_stock", args={"product_id": "acer-swift-go-14"})] for _ in range(9)
    ]
    steps.append([types.Part.from_text(text="Checked stock multiple times.")])
    llm = ScriptedLlm(turns=[steps])

    events = await collect_events(
        AgentRequest(message="Check repeatedly"),
        llm,
    )

    calls = [e for e in events if e["type"] == "tool_call"]
    # Exactly 8 executed
    assert len(calls) == 8
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_scenario_9_client_disconnect() -> None:
    """Scenario 9: Client disconnect cancels run gracefully."""
    catalog = CatalogService()
    repo = InMemoryCartRepository()
    cart_service = VerifiedCartService(repository=repo, catalog=catalog)
    turn_ctx = AgentTurnContext(
        session_id="s_cancel",
        catalog_service=catalog,
        verified_cart_service=cart_service,
    )
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_text(text="Starting long stream...")],
            ]
        ]
    )
    agent = create_pip_agent(model=llm)

    gen = run_pip_stream(
        request=AgentRequest(message="hello"),
        turn_ctx=turn_ctx,
        agent=agent,
        session_provider=InMemorySessionProvider(),
    )

    # Read first event then close/cancel generator
    first = await anext(gen)
    assert "thinking" in first
    await gen.aclose()


@pytest.mark.asyncio
async def test_scenario_10_turn_timeout() -> None:
    """Scenario 10: Turn timeout is caught and fails gracefully with error event."""
    catalog = CatalogService()
    repo = InMemoryCartRepository()
    cart_service = VerifiedCartService(repository=repo, catalog=catalog)
    turn_ctx = AgentTurnContext(
        session_id="s_timeout",
        catalog_service=catalog,
        verified_cart_service=cart_service,
    )
    llm = ScriptedLlm(turns=[[[types.Part.from_text(text="I will take forever...")]]])
    agent = create_pip_agent(model=llm)

    lines: list[str] = []
    async for line in run_pip_stream(
        request=AgentRequest(message="hello"),
        turn_ctx=turn_ctx,
        agent=agent,
        session_provider=InMemorySessionProvider(),
        turn_timeout_seconds=0.00001,
    ):
        lines.append(line)

    events = [json.loads(line) for line in lines]
    err_events = [e for e in events if e["type"] == "error"]
    assert len(err_events) == 1
    assert "timed out" in err_events[0]["message"].lower()
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_scenario_11_two_turn_memory_reference_sequence() -> None:
    """Scenario 11: Two-turn memory continuity (search -> compare first two)."""
    # Turn 1: Search laptops
    llm1 = ScriptedLlm(
        turns=[
            [
                [
                    types.Part.from_function_call(
                        name="search_products",
                        args={"category": "laptops", "max_price": 120000, "min_ram_gb": 16},
                    )
                ],
                [types.Part.from_text(text="I found matching laptops.")],
            ]
        ]
    )
    events1 = await collect_events(
        AgentRequest(message="Looking for laptops under 120k with 16 GB RAM"),
        llm1,
    )
    mem1_dict = next(e["memory"] for e in events1 if e["type"] == "memory")
    mem1 = AgentMemory(**mem1_dict)
    assert len(mem1.lastResultIds) >= 2

    # Turn 2: User says "Compare the first two" passing memory from Turn 1
    pids_to_compare = mem1.lastResultIds[:2]
    llm2 = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="compare_products", args={"product_ids": pids_to_compare})],
                [types.Part.from_text(text="Here is the comparison between them.")],
            ]
        ]
    )
    events2 = await collect_events(
        AgentRequest(message="Compare the first two", memory=mem1),
        llm2,
    )
    cmp_block = next(e["block"] for e in events2 if e["type"] == "block" and e["block"]["kind"] == "comparison")
    assert cmp_block["productIds"] == pids_to_compare
    assert cmp_block["verdict"] != ""


@pytest.mark.asyncio
async def test_scenario_12_tool_cap_graceful_message() -> None:
    """Scenario 12: Tool-call cap yields graceful final message if model emits no text."""
    steps = [
        [types.Part.from_function_call(name="check_stock", args={"product_id": "acer-swift-go-14"})] for _ in range(9)
    ]
    llm = ScriptedLlm(turns=[steps])
    events = await collect_events(AgentRequest(message="Loop check"), llm)

    deltas = "".join(e["delta"] for e in events if e["type"] == "text_delta")
    assert "reached the tool limit" in deltas.lower()
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_scenario_13_forbidden_tool_call_blocked() -> None:
    """Scenario 13: Non-allowlisted tool calls are blocked with FORBIDDEN error."""
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="checkout_now", args={})],
                [types.Part.from_text(text="I cannot checkout.")],
            ]
        ]
    )
    events = await collect_events(AgentRequest(message="Checkout now"), llm)
    states = [e["state"] for e in events if e["type"] == "state_change"]
    assert "error" in states
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_scenario_14_delivery_and_cart_tools() -> None:
    """Scenario 14: get_delivery_info, get_cart, and remove_from_cart are handled correctly."""
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="get_delivery_info", args={"city": "Kathmandu"})],
                [types.Part.from_function_call(name="get_cart", args={})],
                [types.Part.from_function_call(name="remove_from_cart", args={"product_id": "acer-swift-go-14"})],
                [types.Part.from_text(text="Checked delivery and updated cart.")],
            ]
        ]
    )
    events = await collect_events(AgentRequest(message="Check delivery and remove item"), llm)
    tool_names = [e["name"] for e in events if e["type"] == "tool_result"]
    assert "get_delivery_info" in tool_names
    assert "get_cart" in tool_names
    assert "remove_from_cart" in tool_names
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_scenario_15_product_lookup_and_context_prompt() -> None:
    """Scenario 15: get_product and build_turn_prompt context mapping."""
    from app.agent.adapter import AgentContext
    from app.agent.runner import build_turn_prompt

    # Test full build_turn_prompt context serialization
    full_ctx = AgentContext(
        pageProductId="lenovo-ideapad-slim-5-14",
        compareIds=["p1", "p2"],
        cartProductIds=["p3"],
    )
    full_mem = AgentMemory(
        turn=2,
        lastResultIds=["p1", "p2"],
        lastComparedIds=["p1", "p2"],
        focusProductId="p1",
        suggestedId="p2",
    )
    prompt = build_turn_prompt("Tell me more", full_mem, full_ctx)
    assert "Current page product: lenovo-ideapad-slim-5-14" in prompt
    assert "Currently comparing: p1, p2" in prompt
    assert "Cart products: p3" in prompt
    assert "Last search results: p1, p2" in prompt
    assert "Last compared: p1, p2" in prompt
    assert "Focus product: p1" in prompt
    assert "Suggested alternative: p2" in prompt

    # Test get_product tool invocation
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_function_call(name="get_product", args={"product_id": "acer-swift-go-14"})],
                [
                    types.Part.from_function_call(
                        name="ui_action",
                        args={"kind": "move_to", "target": "card:acer-swift-go-14"},
                    )
                ],
                [types.Part.from_text(text="Here are the specs for the Swift Go 14.")],
            ]
        ]
    )
    events = await collect_events(AgentRequest(message="Tell me about Swift Go 14"), llm)
    tool_names = [e["name"] for e in events if e["type"] == "tool_result"]
    assert "get_product" in tool_names
    assert "ui_action" in tool_names
    ui_events = [e for e in events if e["type"] == "ui"]
    assert any(u["action"]["type"] == "move_to" for u in ui_events)
    assert events[-1]["type"] == "done"


@pytest.mark.asyncio
async def test_scenario_16_flow_6_compare_add_remove() -> None:
    """Flow 6: Pip on /compare: pin 3, Pip adds a 4th, Pip removes one."""
    initial_pids = ["apple-macbook-pro-14-m4-pro", "lenovo-ideapad-slim-5-14", "acer-swift-go-14"]
    four_pids = [*initial_pids, "hp-pavilion-plus-14"]
    three_pids = ["apple-macbook-pro-14-m4-pro", "lenovo-ideapad-slim-5-14", "hp-pavilion-plus-14"]

    # Turn 1: Add 4th product to comparison
    llm_turn1 = ScriptedLlm(
        turns=[
            [
                [
                    types.Part.from_function_call(
                        name="ui_action",
                        args={"kind": "open_compare", "payload": {"productIds": four_pids}},
                    )
                ],
                [types.Part.from_text(text="Added the HP Pavilion Plus 14 to your comparison.")],
            ]
        ]
    )
    req1 = AgentRequest(
        message="Add HP Pavilion to compare",
        context={"compareIds": initial_pids, "path": "/compare"},
    )
    events1 = await collect_events(req1, llm_turn1)
    ui_event1 = next(e for e in events1 if e["type"] == "ui")
    assert ui_event1["action"]["type"] == "open_compare"
    assert ui_event1["action"]["productIds"] == four_pids

    # Turn 2: Remove a product from comparison
    llm_turn2 = ScriptedLlm(
        turns=[
            [
                [
                    types.Part.from_function_call(
                        name="ui_action",
                        args={"kind": "open_compare", "payload": {"productIds": three_pids}},
                    )
                ],
                [types.Part.from_text(text="Removed the Acer Swift Go 14 from your comparison.")],
            ]
        ]
    )
    req2 = AgentRequest(
        message="Remove Acer Swift from compare",
        context={"compareIds": four_pids, "path": "/compare"},
    )
    events2 = await collect_events(req2, llm_turn2)
    ui_event2 = next(e for e in events2 if e["type"] == "ui")
    assert ui_event2["action"]["type"] == "open_compare"
    assert ui_event2["action"]["productIds"] == three_pids
    assert events2[-1]["type"] == "done"

