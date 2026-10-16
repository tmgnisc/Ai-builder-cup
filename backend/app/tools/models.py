from typing import Any, Awaitable, Callable, Generic, TypeVar

from pydantic import BaseModel, Field

from ..domain.chaos import ChaosConfig
from ..domain.models import (
    Cart,
    Category,
    CompareKey,
    Product,
    Sort,
)
from ..services.cart import CartService
from ..services.catalog import CatalogService
from ..services.verified_cart import VerifiedCartService


class ToolContext:
    """Execution context injected into agent tool handlers."""

    def __init__(
        self,
        session_id: str,
        chaos: ChaosConfig,
        catalog_service: CatalogService,
        cart_service: CartService,
        verified_cart_service: VerifiedCartService | None = None,
    ) -> None:
        self.session_id = session_id
        self.chaos = chaos
        self.catalog_service = catalog_service
        self.cart_service = cart_service
        self.verified_cart_service = (
            verified_cart_service
            if verified_cart_service is not None
            else VerifiedCartService(cart_service.repository, catalog_service)
        )


# --- Tool Input & Output Models ---


class SearchProductsInput(BaseModel):
    q: str | None = None
    category: Category | None = None
    minPrice: float | None = None
    maxPrice: float | None = None
    minRamGB: float | None = None
    minBatteryHours: float | None = None
    maxWeightGrams: float | None = None
    tags: list[str] | None = None
    brands: list[str] | None = None
    sort: Sort | None = None
    limit: int = Field(default=12, gt=0, le=24)


class SearchProductsOutput(BaseModel):
    products: list[Product]
    total: int
    searched: int


class GetProductInput(BaseModel):
    productId: str


class CompareProductsInput(BaseModel):
    productIds: list[str] = Field(min_length=2, max_length=4)
    priorities: list[CompareKey] | None = None
    context: str | None = None


class CompareProductsOutput(BaseModel):
    productIds: list[str]
    winnerId: str | None
    verdict: str
    advantages: dict[str, list[str]]


class CheckStockInput(BaseModel):
    productId: str


class CheckStockOutput(BaseModel):
    productId: str
    inStock: bool
    quantity: int


class GetDeliveryInfoInput(BaseModel):
    city: str = "Kathmandu"
    productId: str | None = None


class AddToCartToolInput(BaseModel):
    productId: str
    qty: int = Field(default=1, ge=1, le=5)


class CartOutput(BaseModel):
    cart: Cart


class RemoveFromCartToolInput(BaseModel):
    productId: str


class EmptyInput(BaseModel):
    pass


class ToolOutcome(BaseModel):
    ok: bool
    output: Any | None = None
    error: dict[str, str] | None = None
    durationMs: int
    summary: str


InputT = TypeVar("InputT", bound=BaseModel)
OutputT = TypeVar("OutputT", bound=BaseModel)


class ToolDefinition(Generic[InputT, OutputT]):
    """Pure definition of an agent tool matching TS ToolDef."""

    def __init__(
        self,
        name: str,
        description: str,
        input_model: type[InputT],
        output_model: type[OutputT],
        handler: Callable[[InputT, ToolContext], Awaitable[OutputT] | OutputT],
        summarize: Callable[[OutputT], str],
        mutation: bool = False,
    ) -> None:
        self.name = name
        self.description = description
        self.input_model = input_model
        self.output_model = output_model
        self.handler = handler
        self.summarize = summarize
        self.mutation = mutation
