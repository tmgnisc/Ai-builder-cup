import json
from typing import Any

import pytest
from google.genai import types

from app.agent.adapter import (
    AgentMemory,
    AgentRequest,
    BundleBlock,
    SubAgentEvent,
)
from app.agent.agent import create_pip_agent
from app.agent.runner import InMemorySessionProvider, run_pip_stream
from app.agent.subagents.cart_guard import batch_cart_with_guard
from app.agent.subagents.comparator import analyze_comparison
from app.agent.subagents.product_finder import scout_multiple_products
from app.agent.tools_adk import AgentTurnContext, current_turn_context
from app.repositories.cart import InMemoryCartRepository
from app.services.catalog import CatalogService
from app.services.verified_cart import VerifiedCartService
from tests.scripted_llm import ScriptedLlm


@pytest.fixture
def agent_turn_context() -> AgentTurnContext:
    catalog = CatalogService()
    repo = InMemoryCartRepository()
    cart_service = VerifiedCartService(repository=repo, catalog=catalog)
    return AgentTurnContext(
        session_id="test_multiagent_sess",
        catalog_service=catalog,
        verified_cart_service=cart_service,
        message_id="msg_test_multi",
    )


def test_scout_multiple_products(agent_turn_context: AgentTurnContext) -> None:
    token = current_turn_context.set(agent_turn_context)
    try:
        specs = [
            {"label": "Developer Laptop", "category": "laptops", "q": "developer", "max_price": 200000},
            {"label": "Audio", "category": "headphones", "q": "travel", "max_price": 60000},
        ]
        result = scout_multiple_products(items=specs)

        assert "slots" in result
        assert len(result["slots"]) == 2
        assert result["total_products"] > 0
        assert "bundle" in result
        assert result["bundle"]["total_price_npr"] > 0
        assert len(result["all_product_ids"]) > 0

        # Verify events emitted into event_queue
        events = agent_turn_context.event_queue
        subagent_events = [e for e in events if isinstance(e, SubAgentEvent)]
        assert len(subagent_events) >= 2
        assert subagent_events[0].agent == "scout"
        assert subagent_events[0].status == "searching"
        assert subagent_events[-1].agent == "scout"
        assert subagent_events[-1].status == "completed"

        # Verify BundleBlock emitted
        from app.agent.adapter import BlockEvent
        block_events = [e for e in events if isinstance(e, BlockEvent) and isinstance(e.block, BundleBlock)]
        assert len(block_events) == 1
        bundle = block_events[0].block
        assert len(bundle.items) == 2
        assert bundle.totalPrice > 0
    finally:
        current_turn_context.reset(token)


def test_analyze_comparison(agent_turn_context: AgentTurnContext) -> None:
    token = current_turn_context.set(agent_turn_context)
    try:
        pids = ["apple-macbook-air-m3-13", "acer-swift-go-14"]
        result = analyze_comparison(product_ids=pids, priorities=["battery", "weight"])

        assert result["productIds"] == pids
        assert "verdict" in result
        assert len(result["verdict"]) > 0

        events = agent_turn_context.event_queue
        subagent_events = [e for e in events if isinstance(e, SubAgentEvent)]
        assert any(e.agent == "analyst" and e.status == "analyzing" for e in subagent_events)
        assert any(e.agent == "analyst" and e.status == "completed" for e in subagent_events)
    finally:
        current_turn_context.reset(token)


@pytest.mark.asyncio
async def test_batch_cart_with_guard(agent_turn_context: AgentTurnContext) -> None:
    token = current_turn_context.set(agent_turn_context)
    try:
        items = [
            {"product_id": "apple-macbook-air-m3-13", "quantity": 1},
            {"product_id": "sony-wh-1000xm5", "quantity": 1},
        ]
        result = await batch_cart_with_guard(items=items, destination_city="Kathmandu")

        assert result["ok"] is True
        assert len(result["verified_items"]) == 2
        assert len(result["failed_items"]) == 0

        events = agent_turn_context.event_queue
        subagent_events = [e for e in events if isinstance(e, SubAgentEvent)]
        assert any(e.agent == "guard" and e.status == "verifying" for e in subagent_events)
        assert any(e.agent == "guard" and e.status == "completed" for e in subagent_events)
    finally:
        current_turn_context.reset(token)


@pytest.mark.asyncio
async def test_multi_agent_pip_orchestration_turn() -> None:
    """Tests Pip delegating to Scout sub-agent via ScriptedLlm."""
    catalog = CatalogService()
    repo = InMemoryCartRepository()
    cart_service = VerifiedCartService(repository=repo, catalog=catalog)
    turn_ctx = AgentTurnContext(
        session_id="multiagent_orchestration_test",
        catalog_service=catalog,
        verified_cart_service=cart_service,
    )

    # Pip receives user request for laptop + headphones and delegates to scout_multiple_products
    llm = ScriptedLlm(
        turns=[
            [
                [
                    types.Part.from_function_call(
                        name="scout_multiple_products",
                        args={
                            "items": [
                                {"label": "Laptop", "category": "laptops", "q": "developer"},
                                {"label": "Headphones", "category": "headphones", "q": "travel"},
                            ]
                        },
                    )
                ],
                [
                    types.Part.from_text(
                        text="I scouted a matching laptop and noise-cancelling headphones for you. The package total is NPR 226,000."
                    )
                ],
            ]
        ]
    )

    agent = create_pip_agent(model=llm)
    lines: list[str] = []
    req = AgentRequest(message="I need a lightweight laptop for college and noise-cancelling headphones.")

    async for line in run_pip_stream(
        request=req,
        turn_ctx=turn_ctx,
        agent=agent,
        session_provider=InMemorySessionProvider(),
    ):
        lines.append(line)

    parsed = [json.loads(line) for line in lines]
    types_emitted = [p["type"] for p in parsed]

    assert "state_change" in types_emitted
    assert "tool_call" in types_emitted
    assert "subagent" in types_emitted
    assert "block" in types_emitted
    assert "tool_result" in types_emitted
    assert "text_delta" in types_emitted
    assert "done" in types_emitted

    # Verify subagent event content
    subagent_events = [p for p in parsed if p["type"] == "subagent"]
    assert len(subagent_events) >= 2
    assert subagent_events[0]["agent"] == "scout"
    assert subagent_events[-1]["status"] == "completed"

    # Verify bundle block content
    block_events = [p for p in parsed if p["type"] == "block" and p["block"]["kind"] == "bundle"]
    assert len(block_events) == 1
    bundle_block = block_events[0]["block"]
    assert len(bundle_block["items"]) == 2
