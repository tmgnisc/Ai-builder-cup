from fastapi import APIRouter, HTTPException

from ..schemas import Product, ProductList

router = APIRouter()

# TODO: move the catalog here (or into Firestore) from src/data/products.ts.
PRODUCTS: list[Product] = []


@router.get("", response_model=ProductList)
def search(q: str = ""):
    items = [p for p in PRODUCTS if q.lower() in p.name.lower()]
    return ProductList(items=items, total=len(items))


@router.get("/{product_id}", response_model=Product)
def get_one(product_id: str):
    product = next((p for p in PRODUCTS if p.id == product_id), None)
    if product is None:
        raise HTTPException(404, f"No product with id '{product_id}'.")
    return product
