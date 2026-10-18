from typing import Sequence

from ..domain.catalog import (
    get_all_products,
    get_brands,
    get_product,
    search_products,
)
from ..domain.compare import compare_products
from ..domain.models import (
    Category,
    CompareKey,
    CompareResult,
    Product,
    ProductQuery,
    ProductSearchResult,
)


class CatalogService:
    """Orchestrates catalog retrieval, searching, and product comparisons."""

    def __init__(self, products: Sequence[Product] | None = None) -> None:
        self._products = list(products) if products is not None else None

    def get_all(self) -> list[Product]:
        return list(self._products) if self._products is not None else get_all_products()

    def get_product(self, product_id: str) -> Product | None:
        return get_product(product_id, self.get_all())

    def search(self, query: ProductQuery) -> ProductSearchResult:
        return search_products(query, self.get_all())

    def get_brands(self, category: Category | None = None) -> list[str]:
        return get_brands(category, self.get_all())

    def compare(
        self,
        products: list[Product],
        priorities: list[CompareKey] | None = None,
        context: str | None = None,
    ) -> CompareResult:
        return compare_products(products, priorities, context)

    def add_product(self, product: Product) -> Product:
        if self._products is None:
            self._products = list(get_all_products())
        self._products = [p for p in self._products if p.id != product.id]
        self._products.append(product)
        return product

    def update_stock(self, product_id: str, stock: int) -> bool:
        if self._products is None:
            self._products = list(get_all_products())
        for idx, p in enumerate(self._products):
            if p.id == product_id:
                data = p.model_dump()
                data["stock"] = stock
                self._products[idx] = Product(**data)
                return True
        return False

