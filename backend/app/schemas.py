from pydantic import BaseModel, Field


class Health(BaseModel):
    status: str
    gemini: bool


class Product(BaseModel):
    # TODO: mirror the full ProductSchema from src/lib/commerce/schemas.ts.
    id: str
    name: str
    price: int


class ProductList(BaseModel):
    items: list[Product]
    total: int


class CartLine(BaseModel):
    productId: str
    qty: int


class Cart(BaseModel):
    lines: list[CartLine]


class AddToCart(BaseModel):
    productId: str = Field(min_length=1)
    qty: int = Field(default=1, ge=1)


class RemoveFromCart(BaseModel):
    productId: str = Field(min_length=1)


class AgentRequest(BaseModel):
    """Same shape as the Next.js `/api/agent` body."""

    message: str = Field(min_length=1)
    memory: dict | None = None
    context: dict | None = None


class AgentReply(BaseModel):
    reply: str
