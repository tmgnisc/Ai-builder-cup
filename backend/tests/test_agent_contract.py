import json
from pathlib import Path
from typing import get_args

from pydantic import TypeAdapter

from app.agent.adapter import (
    AgentEvent,
    AgentMemory,
    BlockEvent,
    BundleBlock,
    CartActionBlock,
    ComparisonBlock,
    DoneEvent,
    ErrorEvent,
    MemoryEvent,
    MessageStartEvent,
    MissingInfoEvent,
    ProductCarouselBlock,
    StateChangeEvent,
    SubAgentEvent,
    TextDeltaEvent,
    ToolCallEvent,
    ToolResultEvent,
    UIAction,
    UiEvent,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "agent_events_schema.json"


def test_event_schema_contract_parity() -> None:
    """Verifies that Python AgentEvent union mirrors TypeScript AgentEventSchema exactly."""
    assert FIXTURE_PATH.exists(), f"Missing schema fixture at {FIXTURE_PATH}"

    with open(FIXTURE_PATH, encoding="utf-8") as f:
        contract = json.load(f)

    expected_event_types = set(contract["eventTypes"])

    # Extract all event models from Union inside Annotated in app.agent.adapter
    union_type = get_args(AgentEvent)[0]
    adapter_events = get_args(union_type)
    python_event_models = [m for m in adapter_events if hasattr(m, "model_fields")]
    python_event_types = {m.model_fields["type"].default for m in python_event_models}

    # 1. Exact match on event types (fails if union drifts)
    assert python_event_types == expected_event_types, (
        f"Event types drifted: Python {python_event_types} vs TS {expected_event_types}"
    )

    # 2. Check required properties match for each event
    model_by_type = {m.model_fields["type"].default: m for m in python_event_models}
    for event_spec in contract["events"]:
        t = event_spec["type"]
        model = model_by_type[t]
        required_in_ts = set(event_spec["required"])
        for prop in required_in_ts:
            assert prop in model.model_fields, f"Missing property {prop} in Python model {model.__name__}"
            if prop != "type":
                field = model.model_fields[prop]
                assert field.is_required(), f"Property {prop} is required in TS but optional in Python {model.__name__}"


def test_every_event_type_validates_against_agent_event() -> None:
    """Validates sample instances of every event type against AgentEvent TypeAdapter."""
    adapter = TypeAdapter(AgentEvent)

    samples = [
        StateChangeEvent(state="thinking", caption="Thinking…"),
        MessageStartEvent(messageId="msg_1"),
        TextDeltaEvent(messageId="msg_1", delta="hello"),
        ToolCallEvent(messageId="msg_1", callId="c_1", name="search_products", input={}),
        ToolResultEvent(
            messageId="msg_1",
            callId="c_1",
            name="search_products",
            ok=True,
            summary="6 results",
            durationMs=12,
        ),
        BlockEvent(messageId="msg_1", block=ProductCarouselBlock(id="b_1", productIds=["p_1"])),
        BlockEvent(
            messageId="msg_1",
            block=ComparisonBlock(id="b_2", productIds=["p_1", "p_2"], verdict="A wins"),
        ),
        BlockEvent(
            messageId="msg_1",
            block=BundleBlock(id="b_4", title="Bundle", items=[], totalPrice=0.0, productIds=[]),
        ),
        SubAgentEvent(agent="scout", name="Product Finder (Scout)", status="searching", task="Scouting products"),
        UiEvent(action=UIAction(type="highlight", productIds=["p_1"])),
        MissingInfoEvent(field="backlight", productId="lenovo-ideapad-slim-5-14", question="Is it backlit?"),
        MemoryEvent(memory=AgentMemory()),
        ErrorEvent(message="Something failed"),
        DoneEvent(),
    ]

    for sample in samples:
        dumped = sample.model_dump()
        validated = adapter.validate_python(dumped)
        assert validated.model_dump()["type"] == dumped["type"]


def test_ui_action_tolerates_snake_case_and_unknown_keys() -> None:
    from app.agent.agent import ui_action_from

    action = ui_action_from("set_filters", None, {"max_price": 120000, "category": "laptops", "min_battery": 8})
    assert action is not None
    assert action.type == "set_filters"
    assert action.maxPrice == 120000
    assert action.category == "laptops"
    # Still-invalid actions are skipped instead of raising (which used to abort the whole turn).
    assert ui_action_from("not_a_kind", None, {}) is None
