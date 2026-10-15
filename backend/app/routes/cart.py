from flask import Blueprint, abort, jsonify, request

bp = Blueprint("cart", __name__)

# TODO: in-memory carts don't survive multiple Cloud Run instances; move to Firestore.
CARTS: dict[str, dict[str, int]] = {}


def _session_id() -> str:
    sid = request.cookies.get("persona_sid")
    if not sid:
        abort(400, description="Missing persona_sid cookie.")
    return sid


def _cart_json(sid: str):
    lines = [{"productId": pid, "qty": qty} for pid, qty in CARTS.get(sid, {}).items()]
    return jsonify(lines=lines)


@bp.get("")
def get_cart():
    return _cart_json(_session_id())


@bp.post("")
def add_item():
    sid = _session_id()
    body = request.get_json(silent=True) or {}
    product_id, qty = body.get("productId"), body.get("qty", 1)
    if not product_id or not isinstance(qty, int) or qty < 1:
        abort(400, description="Body needs productId and an integer qty >= 1.")
    cart = CARTS.setdefault(sid, {})
    cart[product_id] = cart.get(product_id, 0) + qty
    return _cart_json(sid), 201


@bp.delete("")
def remove_item():
    sid = _session_id()
    product_id = (request.get_json(silent=True) or {}).get("productId")
    CARTS.get(sid, {}).pop(product_id, None)
    return _cart_json(sid)
