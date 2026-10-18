from typing import Any, Literal

from pydantic import BaseModel, Field

Category = Literal["laptops", "phones", "headphones", "accessories", "clothing"]

CATEGORIES: list[dict[str, str]] = [
    {"id": "laptops", "label": "Laptops"},
    {"id": "phones", "label": "Phones"},
    {"id": "headphones", "label": "Headphones"},
    {"id": "accessories", "label": "Accessories"},
    {"id": "clothing", "label": "Clothing"},
]

# Clothing: how a garment is worn. Drives the virtual try-on rig (which body landmarks it follows).
Garment = Literal["top", "outerwear", "headwear", "eyewear", "shawl"]
Sleeves = Literal["none", "short", "long"]
GarmentLength = Literal["waist", "hip", "thigh"]
Pattern = Literal["solid", "check", "stripe", "dhaka"]


class ColorOption(BaseModel):
    name: str
    hex: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class ProductSpecs(BaseModel):
    cpu: str | None = None
    ramGB: int | None = None
    storageGB: int | None = None
    gpu: str | None = None
    batteryHours: float | None = None
    weightGrams: int = Field(default=350, gt=0)
    screen: str | None = None
    warrantyMonths: int = Field(default=12, ge=0)
    ports: str | None = None
    connectivity: str | None = None
    anc: bool | None = None
    camera: str | None = None
    # Clothing
    material: str | None = None
    fit: str | None = None
    sizes: list[str] | None = None
    colors: list[ColorOption] | None = None
    garment: Garment | None = None
    sleeves: Sleeves | None = None
    length: GarmentLength | None = None
    pattern: Pattern | None = None


class Product(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    name: str
    brand: str
    category: Category
    price: int = Field(gt=0)
    stock: int = Field(ge=0)
    rating: float = Field(ge=0.0, le=5.0)
    reviewCount: int = Field(ge=0)
    blurb: str
    tags: list[str]
    specs: ProductSpecs
    palette: tuple[str, str]
    image: str | None = None


Sort = Literal["relevance", "price-asc", "price-desc", "rating", "battery", "weight"]


class ProductQuery(BaseModel):
    q: str | None = Field(default=None, max_length=200)
    category: Category | None = None
    brands: list[str] | None = None
    minPrice: float | None = Field(default=None, ge=0)
    maxPrice: float | None = Field(default=None, gt=0)
    minRamGB: float | None = Field(default=None, gt=0)
    minBatteryHours: float | None = Field(default=None, gt=0)
    maxWeightGrams: float | None = Field(default=None, gt=0)
    tags: list[str] | None = None
    inStockOnly: bool | None = None
    sort: Sort | None = None
    limit: int | None = Field(default=None, gt=0, le=100)


class ProductSearchResult(BaseModel):
    products: list[Product]
    total: int
    tookMs: int | None = None


class CartLine(BaseModel):
    productId: str
    name: str
    unitPrice: int = Field(gt=0)
    qty: int = Field(gt=0)
    lineTotal: int = Field(ge=0)


class Cart(BaseModel):
    lines: list[CartLine]
    itemCount: int = Field(ge=0)
    subtotal: int = Field(ge=0)
    updatedAt: str


class AddToCartInput(BaseModel):
    productId: str
    qty: int = Field(default=1, ge=1, le=10)


class SetQtyInput(BaseModel):
    productId: str
    qty: int = Field(ge=0, le=10)


class DeliveryInfo(BaseModel):
    city: str
    zone: Literal["valley", "outside"]
    days: str
    fee: int
    freeOver: int


CompareKey = Literal["price", "ram", "storage", "battery", "weight", "warranty", "rating"]
TextKey = Literal["cpu", "gpu", "screen", "ports", "connectivity", "camera"]


class CompareRow(BaseModel):
    key: str
    label: str
    values: dict[str, str]
    winners: list[str]
    numeric: bool


class CompareResult(BaseModel):
    productIds: list[str]
    rows: list[CompareRow]
    advantages: dict[str, list[str]]
    predicates: dict[str, list[str]]
    scores: dict[str, float]
    winnerId: str | None
    verdict: str


class VerifiedChange(BaseModel):
    requested_change: dict[str, Any]
    verified: bool
    cart: Cart
