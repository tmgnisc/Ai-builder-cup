from flask import Blueprint, abort, jsonify, request

bp = Blueprint("products", __name__)

# TODO: move the catalog here (or into Firestore) from src/data/products.ts.
PRODUCTS: list[dict] = []


@bp.get("")
def search():
    q = request.args.get("q", "").lower()
    items = [p for p in PRODUCTS if q in p.get("name", "").lower()]
    return jsonify(items=items, total=len(items))


@bp.get("/<product_id>")
def get_one(product_id: str):
    product = next((p for p in PRODUCTS if p.get("id") == product_id), None)
    if product is None:
        abort(404, description=f"No product with id '{product_id}'.")
    return jsonify(product)
