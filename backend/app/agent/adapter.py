from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

PipState = Literal[
    "idle",
    "greeting",
    "listening",
    "thinking",
    "searching",
    "presenting",
    "comparing",
    "speaking",
    "acting",
    "success",
    "error",
    "sleeping",
]

CompareKey = Literal["price", "ram", "storage", "battery", "weight", "warranty", "rating"]


# ── Rich Message Blocks ──


class ProductCarouselBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["product_carousel"] = "product_carousel"
    id: str
    title: str | None = None
    productIds: list[str]


class ComparisonBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["comparison"] = "comparison"
    id: str
    productIds: list[str]
    verdict: str
    winnerId: str | None = None
    context: str | None = None
    priorities: list[CompareKey] | None = None


class CartActionBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["cart_action"] = "cart_action"
    id: str
    action: Literal["add", "remove"]
    productId: str
    status: Literal["pending", "verified", "failed"]
    line: dict[str, Any] | None = None
    message: str | None = None


class ClarifyBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["clarify"] = "clarify"
    id: str
    question: str | None = None
    options: list[str]


class BundleItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slot: str
    productId: str
    name: str
    price: float
    brand: str | None = None


class BundleBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["bundle"] = "bundle"
    id: str
    title: str
    items: list[BundleItem]
    totalPrice: float
    productIds: list[str]


Block = Annotated[
    Union[ProductCarouselBlock, ComparisonBlock, CartActionBlock, ClarifyBlock, BundleBlock],
    Field(discriminator="kind"),
]


# ── UI Actions ──


class UIAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal[
        "highlight",
        "move_to",
        "scroll_to",
        "set_filters",
        "open_drawer",
        "open_compare",
        "cart_updated",
        "navigate",
    ]
    productIds: list[str] | None = None
    anchorId: str | None = None
    between: tuple[str, str] | None = None
    corner: Literal["tl", "tr", "bl", "br"] | None = None
    x: float | None = None
    y: float | None = None
    size: Literal["presenting", "anchored", "free"] | None = None
    category: str | None = None
    maxPrice: float | None = None
    name: Literal["cart", "compare", "history"] | None = None
    context: str | None = None
    priorities: list[CompareKey] | None = None
    flyProductId: str | None = None
    to: Literal["/checkout", "/"] | None = None


# ── Memory & Context ──


class ParsedQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str | None = None
    minPrice: float | None = None
    maxPrice: float | None = None
    minRamGB: int | None = None
    minBatteryHours: int | None = None
    maxWeightGrams: int | None = None
    tags: list[str] | None = None
    brands: list[str] | None = None
    needs: list[str] = Field(default_factory=list)
    priorities: list[CompareKey] = Field(default_factory=list)
    sort: str | None = None
    text: str | None = None


class AgentMemory(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lastResultIds: list[str] = Field(default_factory=list)
    lastComparedIds: list[str] = Field(default_factory=list)
    lastQuery: ParsedQuery | None = None
    focusProductId: str | None = None
    suggestedId: str | None = None
    turn: int = 0


class AgentContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pageProductId: str | None = None
    compareIds: list[str] = Field(default_factory=list)
    cartProductIds: list[str] = Field(default_factory=list)
    path: str = "/"


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(..., min_length=1, max_length=500)
    memory: AgentMemory = Field(default_factory=AgentMemory)
    context: AgentContext = Field(default_factory=AgentContext)


# ── Agent Events ──


class StateChangeEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["state_change"] = "state_change"
    state: PipState
    caption: str | None = None


class MessageStartEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["message_start"] = "message_start"
    messageId: str


class TextDeltaEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["text_delta"] = "text_delta"
    messageId: str
    delta: str


class ToolCallEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["tool_call"] = "tool_call"
    messageId: str
    callId: str
    name: str
    input: Any


class ToolErrorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str
    message: str


class ToolResultEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["tool_result"] = "tool_result"
    messageId: str
    callId: str
    name: str
    ok: bool
    summary: str
    durationMs: int
    error: ToolErrorDetail | None = None


class BlockEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["block"] = "block"
    messageId: str
    block: Block


class UiEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["ui"] = "ui"
    action: UIAction


class MissingInfoEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["missing_info"] = "missing_info"
    field: str = Field(..., min_length=1)
    productId: str = Field(..., min_length=1)
    question: str | None = Field(default=None, max_length=200)


class SubAgentEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["subagent"] = "subagent"
    agent: Literal["scout", "analyst", "guard"]
    name: str
    status: Literal["delegated", "searching", "analyzing", "verifying", "completed", "failed"]
    task: str
    detail: str | None = None
    resultsCount: int | None = None


class MemoryEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["memory"] = "memory"
    memory: AgentMemory


class ErrorEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["error"] = "error"
    message: str


class DoneEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["done"] = "done"


AgentEvent = Annotated[
    Union[
        StateChangeEvent,
        MessageStartEvent,
        TextDeltaEvent,
        ToolCallEvent,
        ToolResultEvent,
        BlockEvent,
        UiEvent,
        MissingInfoEvent,
        SubAgentEvent,
        MemoryEvent,
        ErrorEvent,
        DoneEvent,
    ],
    Field(discriminator="type"),
]


def serialize_event(event: BaseModel) -> str:
    """Serializes an AgentEvent to JSON line string (excluding None values where appropriate)."""
    return event.model_dump_json(exclude_none=True)
