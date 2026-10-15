from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException

from ..schemas import AddToCart, Cart, CartLine, RemoveFromCart

router = APIRouter()

# TODO: in-memory carts don't survive multiple Cloud Run instances; move to Firestore.
CARTS: dict[str, dict[str, int]] = {}


def session_id(persona_sid: Annotated[str | None, Cookie()] = None) -> str:
    if not persona_sid:
        raise HTTPException(400, "Missing persona_sid cookie.")
    return persona_sid


Sid = Annotated[str, Depends(session_id)]


def _cart(sid: str) -> Cart:
    return Cart(lines=[CartLine(productId=pid, qty=qty) for pid, qty in CARTS.get(sid, {}).items()])


@router.get("", response_model=Cart)
def get_cart(sid: Sid):
    return _cart(sid)


@router.post("", response_model=Cart, status_code=201)
def add_item(body: AddToCart, sid: Sid):
    cart = CARTS.setdefault(sid, {})
    cart[body.productId] = cart.get(body.productId, 0) + body.qty
    return _cart(sid)


@router.delete("", response_model=Cart)
def remove_item(body: RemoveFromCart, sid: Sid):
    CARTS.get(sid, {}).pop(body.productId, None)
    return _cart(sid)
