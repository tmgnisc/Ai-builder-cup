import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.errors import ToolError
from app.domain.chaos import ChaosConfig
from app.domain.models import Cart, DeliveryInfo
from app.tools.executor import execute_tool
from app.tools.models import (
    CheckStockOutput,
    CompareProductsOutput,
    SearchProductsOutput,
    ToolContext,
)
from app.tools.registry import TOOLS

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "tools_schema.json"


@pytest.fixture(scope="module")
def tools_schema() -> dict:
    assert FIXTURE_PATH.exists(), f"Missing schema fixture at {FIXTURE_PATH}"
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        return json.load(f)


def test_tools_names_and_metadata_parity(tools_schema: dict) -> None:
    expected_tools = {t["name"]: t for t in tools_schema["tools"]}
    actual_tool_names = set(TOOLS.keys())
    assert actual_tool_names == set(expected_tools.keys()), (
        f"Tool registry drift: Python {actual_tool_names} vs TS {set(expected_tools.keys())}"
    )

    for name, expected in expected_tools.items():
        actual = TOOLS[name]
        assert actual.name == expected["name"]
        assert actual.description == expected["description"], (
            f"Description drift for tool '{name}':\nPython: {actual.description}\nTS:     {expected['description']}"
        )
        assert actual.mutation == expected["mutation"], (
            f"Mutation flag drift for tool '{name}': Python {actual.mutation} vs TS {expected['mutation']}"
        )


def test_tools_summaries_parity(tools_schema: dict) -> None:
    for case in tools_schema["sampleSummaries"]:
        tool_name = case["tool"]
        tool_def = TOOLS[tool_name]
        out_data = case["output"]
        expected_summary = case["expected"]

        # Instantiate output model based on tool
        if tool_name == "search_products":
            model_inst = SearchProductsOutput(
                total=out_data["total"],
                searched=out_data["searched"],
                products=[],
            )
        elif tool_name == "get_product":
            model_inst = type("DummyProduct", (), {"brand": out_data["brand"], "name": out_data["name"]})()
        elif tool_name == "compare_products":
            model_inst = CompareProductsOutput(
                productIds=out_data["productIds"],
                winnerId=out_data["winnerId"],
                verdict="Verdict",
                advantages={},
            )
        elif tool_name == "check_stock":
            model_inst = CheckStockOutput(
                productId=out_data["productId"],
                inStock=out_data["inStock"],
                quantity=out_data["quantity"],
            )
        elif tool_name == "get_delivery_info":
            model_inst = DeliveryInfo(
                city=out_data["city"],
                zone="valley",
                days=out_data["days"],
                fee=0,
                freeOver=50000,
            )
        elif tool_name in ("add_to_cart", "remove_from_cart"):
            model_inst = MagicMock()
        elif tool_name == "get_cart":
            model_inst = type("DummyCart", (), {"itemCount": out_data["itemCount"], "subtotal": out_data["subtotal"]})()
        else:
            pytest.fail(f"Unhandled sample tool: {tool_name}")

        actual_summary = tool_def.summarize(model_inst)
        assert actual_summary == expected_summary, (
            f"Summary drift for {tool_name}: expected '{expected_summary}', got '{actual_summary}'"
        )


@pytest.mark.asyncio
async def test_tools_error_and_transient_wording_parity(tools_schema: dict) -> None:
    expected_transient_msg = tools_schema["transientErrorMessage"]
    expected_error_summaries = tools_schema["errorSummaries"]

    ctx = ToolContext(
        catalog_service=MagicMock(),
        cart_service=AsyncMock(),
        chaos=ChaosConfig(latency_min=0, latency_max=0, failure_rate=1.0),
        session_id="test",
    )

    # 1. Transient failure wording
    outcome = await execute_tool("search_products", {}, ctx)
    assert not outcome.ok
    assert outcome.error["code"] == "TRANSIENT"
    assert outcome.error["message"] == expected_transient_msg, (
        f"Transient error message must be '{expected_transient_msg}', got '{outcome.error['message']}'"
    )
    assert outcome.summary == expected_error_summaries["TRANSIENT"]

    # 2. Check all expected error summaries
    ctx_no_chaos = ToolContext(
        catalog_service=MagicMock(),
        cart_service=AsyncMock(),
        chaos=ChaosConfig(latency_min=0, latency_max=0, failure_rate=0.0),
        session_id="test",
    )

    # Invalid input
    bad_res = await execute_tool("search_products", {"limit": -1}, ctx_no_chaos)
    assert not bad_res.ok
    assert bad_res.error["code"] == "INVALID_INPUT"
    assert bad_res.summary == expected_error_summaries["INVALID_INPUT"]

    # Not found
    ctx_no_chaos.catalog_service.get_product.side_effect = ToolError("NOT_FOUND", "No product.")
    nf_res = await execute_tool("get_product", {"productId": "missing"}, ctx_no_chaos)
    assert not nf_res.ok
    assert nf_res.error["code"] == "NOT_FOUND"
    assert nf_res.summary == expected_error_summaries["NOT_FOUND"]

    # Out of stock
    ctx_no_chaos.catalog_service.get_product.side_effect = ToolError("OUT_OF_STOCK", "Out of stock.")
    oos_res = await execute_tool("get_product", {"productId": "out-of-stock"}, ctx_no_chaos)
    assert not oos_res.ok
    assert oos_res.error["code"] == "OUT_OF_STOCK"
    assert oos_res.summary == expected_error_summaries["OUT_OF_STOCK"]
