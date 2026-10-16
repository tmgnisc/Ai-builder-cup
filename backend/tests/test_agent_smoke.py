import os

import pytest

from app.agent.adapter import AgentRequest
from app.agent.agent import create_pip_agent
from app.agent.runner import InMemorySessionProvider, run_pip_stream
from app.agent.tools_adk import AgentTurnContext
from app.repositories.cart import InMemoryCartRepository
from app.services.catalog import CatalogService
from app.services.verified_cart import VerifiedCartService


@pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="Requires GEMINI_API_KEY environment variable for live smoke testing",
)
@pytest.mark.asyncio
async def test_live_gemini_smoke() -> None:
    """Live smoke test with real Gemini model, skipped by default in CI."""
    catalog = CatalogService()
    cart = VerifiedCartService(InMemoryCartRepository(), catalog)
    turn_ctx = AgentTurnContext(
        session_id="smoke_session",
        catalog_service=catalog,
        verified_cart_service=cart,
    )
    agent = create_pip_agent(model="gemini-2.5-flash")
    req = AgentRequest(message="What laptops do you have under 120000 NPR?")

    events = []
    async for line in run_pip_stream(
        request=req,
        turn_ctx=turn_ctx,
        agent=agent,
        session_provider=InMemorySessionProvider(),
    ):
        events.append(line)

    assert len(events) > 0
    assert any("done" in e for e in events)
