from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.errors import CommerceException
from ...core.security import create_access_token, decode_access_token, hash_password, verify_password
from ...models.db import MerchantUserDB

router = APIRouter(prefix="/api/merchant/auth", tags=["merchant-auth"])

MERCHANT_COOKIE = "merchant_token"


class LoginInput(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=1, max_length=100)


class MerchantUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    storeName: str


class LoginResponse(BaseModel):
    token: str
    user: MerchantUserResponse


class ChangePasswordInput(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=6)


async def get_current_merchant(
    response: Response,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
    authorization: Annotated[str | None, Header()] = None,
    merchant_token: Annotated[str | None, Cookie()] = None,
) -> MerchantUserResponse:
    """Dependency extracting the authenticated merchant user from token or cookie."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif merchant_token:
        token = merchant_token

    if not token:
        raise CommerceException("UNAUTHORIZED", "Merchant authentication required.")

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise CommerceException("UNAUTHORIZED", "Invalid or expired merchant authentication session.")

    user_id = payload["sub"]
    if session is not None:
        stmt = select(MerchantUserDB).where(MerchantUserDB.id == user_id, MerchantUserDB.is_active.is_(True))
        user = (await session.execute(stmt)).scalar_one_or_none()
        if not user:
            raise CommerceException("UNAUTHORIZED", "Merchant account not found or deactivated.")

        return MerchantUserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            storeName=user.store_name,
        )

    # In-memory demo fallback
    return MerchantUserResponse(
        id=user_id,
        email=payload.get("email", "admin@persona.store"),
        name=payload.get("name", "Operations Lead"),
        role="Store Administrator",
        storeName="Persona Flagship Operations",
    )


@router.post("/login", response_model=LoginResponse)
async def merchant_login_endpoint(
    body: LoginInput,
    response: Response,
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
) -> LoginResponse:
    """Authenticates merchant user against PostgreSQL and issues signed session token."""
    clean_email = body.email.strip().lower()

    if session is not None:
        stmt = select(MerchantUserDB).where(
            MerchantUserDB.email == clean_email,
            MerchantUserDB.is_active.is_(True),
        )
        user = (await session.execute(stmt)).scalar_one_or_none()
        if not user or not verify_password(body.password, user.password_hash):
            raise CommerceException("UNAUTHORIZED", "Invalid email or password.")

        # Update last login timestamp
        user.last_login_at = datetime.now(timezone.utc)
        await session.commit()

        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
        })

        # Set secure HTTP-only cookie
        response.set_cookie(
            key=MERCHANT_COOKIE,
            value=token,
            httponly=True,
            samesite="lax",
            path="/",
            max_age=60 * 60 * 24 * 7,
        )

        return LoginResponse(
            token=token,
            user=MerchantUserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                storeName=user.store_name,
            ),
        )

    # Fallback validation if database session is inactive
    if clean_email == "admin@persona.store" and (body.password in ["persona2026", "admin"]):
        token = create_access_token({
            "sub": "usr_admin_01",
            "email": clean_email,
            "name": "Operations Lead",
            "role": "Store Administrator",
        })
        response.set_cookie(
            key=MERCHANT_COOKIE,
            value=token,
            httponly=True,
            samesite="lax",
            path="/",
            max_age=60 * 60 * 24 * 7,
        )
        return LoginResponse(
            token=token,
            user=MerchantUserResponse(
                id="usr_admin_01",
                email=clean_email,
                name="Operations Lead",
                role="Store Administrator",
                storeName="Persona Flagship Operations",
            ),
        )

    raise CommerceException("UNAUTHORIZED", "Invalid email or password.")


@router.get("/me", response_model=MerchantUserResponse)
async def merchant_me_endpoint(
    current_user: Annotated[MerchantUserResponse, Depends(get_current_merchant)],
) -> MerchantUserResponse:
    """Returns the currently authenticated merchant profile."""
    return current_user


@router.post("/logout")
async def merchant_logout_endpoint(response: Response):
    """Clears merchant session cookie."""
    response.delete_cookie(key=MERCHANT_COOKIE, path="/")
    return {"status": "ok", "message": "Successfully logged out of merchant session."}
