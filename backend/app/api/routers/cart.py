import uuid
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, Response
from pydantic import BaseModel

from ...core.config import Settings, get_settings
from ...core.errors import CommerceException
from ...domain.chaos import resolve_chaos, roll_failure, simulate_latency
from ...domain.models import AddToCartInput, Cart, SetQtyInput
from ...services.cart import CartService
from ..dependencies import get_cart_service, verify_shared_secret

router = APIRouter()

SESSION_COOKIE = "persona_sid"


class CartResponse(BaseModel):
    cart: Cart


def _get_or_create_sid(response: Response, persona_sid: str | None) -> str:
    if persona_sid:
        return persona_sid
    new_sid = str(uuid.uuid4())
    response.set_cookie(
        key=SESSION_COOKIE,
        value=new_sid,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    return new_sid


@router.get("", response_model=CartResponse)
async def get_cart_endpoint(
    response: Response,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    persona_sid: Annotated[str | None, Cookie()] = None,
    chaos: float | None = None,
    latency: int | None = None,
    x_persona_chaos: Annotated[str | None, Header()] = None,
    x_persona_latency: Annotated[str | None, Header()] = None,
) -> CartResponse:
    sid = _get_or_create_sid(response, persona_sid)
    chaos_cfg = resolve_chaos(
        chaos_param=chaos,
        latency_param=latency,
        chaos_header=x_persona_chaos,
        latency_header=x_persona_latency,
        env_rate=settings.persona_failure_rate,
        env_min=settings.persona_latency_min_ms,
        env_max=settings.persona_latency_max_ms,
    )

    await simulate_latency(chaos_cfg)
    if roll_failure(chaos_cfg, mutation=False):
        raise CommerceException("TRANSIENT", "The store service hiccuped. Please try again.")

    cart = await cart_service.get_cart(sid)
    return CartResponse(cart=cart)


@router.post("", response_model=CartResponse)
async def add_to_cart_endpoint(
    body: AddToCartInput,
    response: Response,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    persona_sid: Annotated[str | None, Cookie()] = None,
    chaos: float | None = None,
    latency: int | None = None,
    x_persona_chaos: Annotated[str | None, Header()] = None,
    x_persona_latency: Annotated[str | None, Header()] = None,
) -> CartResponse:
    sid = _get_or_create_sid(response, persona_sid)
    chaos_cfg = resolve_chaos(
        chaos_param=chaos,
        latency_param=latency,
        chaos_header=x_persona_chaos,
        latency_header=x_persona_latency,
        env_rate=settings.persona_failure_rate,
        env_min=settings.persona_latency_min_ms,
        env_max=settings.persona_latency_max_ms,
    )

    await simulate_latency(chaos_cfg)
    failure = roll_failure(chaos_cfg, mutation=True)
    if failure == "transient":
        raise CommerceException("TRANSIENT", "The store service hiccuped. Please try again.")

    cart = await cart_service.add_to_cart(sid, body, drop_write=(failure == "silent"))
    return CartResponse(cart=cart)


@router.patch("", response_model=CartResponse)
async def set_qty_endpoint(
    body: SetQtyInput,
    response: Response,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    persona_sid: Annotated[str | None, Cookie()] = None,
    chaos: float | None = None,
    latency: int | None = None,
    x_persona_chaos: Annotated[str | None, Header()] = None,
    x_persona_latency: Annotated[str | None, Header()] = None,
) -> CartResponse:
    sid = _get_or_create_sid(response, persona_sid)
    chaos_cfg = resolve_chaos(
        chaos_param=chaos,
        latency_param=latency,
        chaos_header=x_persona_chaos,
        latency_header=x_persona_latency,
        env_rate=settings.persona_failure_rate,
        env_min=settings.persona_latency_min_ms,
        env_max=settings.persona_latency_max_ms,
    )

    await simulate_latency(chaos_cfg)
    failure = roll_failure(chaos_cfg, mutation=True)
    if failure == "transient":
        raise CommerceException("TRANSIENT", "The store service hiccuped. Please try again.")

    cart = await cart_service.set_qty(sid, body, drop_write=(failure == "silent"))
    return CartResponse(cart=cart)


@router.delete("", response_model=CartResponse)
async def remove_from_cart_endpoint(
    response: Response,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
    productId: str | None = None,
    persona_sid: Annotated[str | None, Cookie()] = None,
    chaos: float | None = None,
    latency: int | None = None,
    x_persona_chaos: Annotated[str | None, Header()] = None,
    x_persona_latency: Annotated[str | None, Header()] = None,
) -> CartResponse:
    sid = _get_or_create_sid(response, persona_sid)
    chaos_cfg = resolve_chaos(
        chaos_param=chaos,
        latency_param=latency,
        chaos_header=x_persona_chaos,
        latency_header=x_persona_latency,
        env_rate=settings.persona_failure_rate,
        env_min=settings.persona_latency_min_ms,
        env_max=settings.persona_latency_max_ms,
    )

    await simulate_latency(chaos_cfg)

    if not productId:
        cleared = await cart_service.clear_cart(sid)
        return CartResponse(cart=cleared)

    failure = roll_failure(chaos_cfg, mutation=True)
    if failure == "transient":
        raise CommerceException("TRANSIENT", "The store service hiccuped. Please try again.")

    cart = await cart_service.remove_from_cart(sid, productId, drop_write=(failure == "silent"))
    return CartResponse(cart=cart)
