import json
import re
from functools import lru_cache
from pathlib import Path

from .models import Category, Product, ProductQuery, ProductSearchResult

STOPWORDS: frozenset[str] = frozenset(
    [
        "a",
        "an",
        "the",
        "for",
        "with",
        "and",
        "or",
        "of",
        "to",
        "in",
        "on",
        "i",
        "me",
        "my",
        "need",
        "want",
        "some",
        "good",
    ]
)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "products.json"


@lru_cache
def get_all_products() -> list[Product]:
    if not DATA_PATH.exists():
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [Product.model_validate(p) for p in raw]


def get_product(product_id: str, products: list[Product] | None = None) -> Product | None:
    pool = products if products is not None else get_all_products()
    for p in pool:
        if p.id == product_id:
            return p
    return None


def get_brands(category: Category | None = None, products: list[Product] | None = None) -> list[str]:
    pool = products if products is not None else get_all_products()
    filtered = [p for p in pool if p.category == category] if category else pool
    brands = {p.brand for p in filtered}
    return sorted(brands)


def haystack(p: Product) -> str:
    cpu = p.specs.cpu or ""
    gpu = p.specs.gpu or ""
    connectivity = p.specs.connectivity or ""
    elements = [p.name, p.brand, p.category, p.blurb, cpu, gpu, connectivity] + p.tags
    return " ".join(elements).lower()


def tokenize(q: str | None) -> list[str]:
    if not q:
        return []
    parts = re.split(r"[^a-z0-9+.-]+", q.lower())
    return [t for t in parts if len(t) > 1 and t not in STOPWORDS]


def text_score(p: Product, tokens: list[str]) -> int:
    if not tokens:
        return 1
    hay = haystack(p)
    return sum(1 for t in tokens if t in hay)


def search_products(query: ProductQuery, products: list[Product] | None = None) -> ProductSearchResult:
    pool = products if products is not None else get_all_products()
    tokens = tokenize(query.q)
    brands = [b.lower() for b in query.brands] if query.brands else None
    tags = [t.lower() for t in query.tags] if query.tags else None

    scored: list[tuple[Product, int]] = []
    for p in pool:
        s = p.specs
        if query.category and p.category != query.category:
            continue
        if brands and p.brand.lower() not in brands:
            continue
        if query.minPrice is not None and p.price < query.minPrice:
            continue
        if query.maxPrice is not None and p.price > query.maxPrice:
            continue
        if query.minRamGB is not None and (s.ramGB or 0) < query.minRamGB:
            continue
        if query.minBatteryHours is not None and (s.batteryHours or 0) < query.minBatteryHours:
            continue
        if query.maxWeightGrams is not None and s.weightGrams > query.maxWeightGrams:
            continue
        if tags and not all(t in p.tags for t in tags):
            continue
        if query.inStockOnly and p.stock == 0:
            continue

        score = text_score(p, tokens)
        if score > 0:
            scored.append((p, score))

    sort = query.sort or "relevance"
    if sort == "price-asc":
        scored.sort(key=lambda x: x[0].price)
    elif sort == "price-desc":
        scored.sort(key=lambda x: -x[0].price)
    elif sort == "rating":
        scored.sort(key=lambda x: -x[0].rating)
    elif sort == "battery":
        scored.sort(key=lambda x: -(x[0].specs.batteryHours or 0.0))
    elif sort == "weight":
        scored.sort(key=lambda x: x[0].specs.weightGrams)
    elif sort == "relevance":
        scored.sort(key=lambda x: (-x[1], -x[0].rating))

    total = len(scored)
    limited = scored[: query.limit] if query.limit else scored
    return ProductSearchResult(products=[x[0] for x in limited], total=total)
