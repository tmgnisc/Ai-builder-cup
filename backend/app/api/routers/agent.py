import logging
import time
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, Query, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from google.adk.models import BaseLlm

from ...agent.adapter import AgentRequest
from ...agent.agent import create_pip_agent
from ...agent.runner import InMemorySessionProvider, SessionProvider, run_pip_stream
from ...agent.tools_adk import AgentTurnContext
from ...core.config import Settings, get_settings
from ...domain.chaos import resolve_chaos
from ...services.catalog import CatalogService
from ...services.verified_cart import VerifiedCartService
from ..dependencies import get_catalog_service, get_verified_cart_service

router = APIRouter(prefix="/api/agent", tags=["agent"])
logger = logging.getLogger(__name__)

_session_rate_limit_timestamps: dict[str, list[float]] = {}


def check_rate_limit(session_id: str, limit: int = 60, window: float = 60.0) -> bool:
    """Sliding-window per-session rate limiter."""
    now = time.monotonic()
    timestamps = _session_rate_limit_timestamps.setdefault(session_id, [])
    active = [t for t in timestamps if now - t < window]
    if len(active) >= limit:
        _session_rate_limit_timestamps[session_id] = active
        return False
    active.append(now)
    _session_rate_limit_timestamps[session_id] = active
    return True


_agent_model_override: str | BaseLlm | None = None
_session_provider_instance: SessionProvider = InMemorySessionProvider()


def get_agent_model() -> str | BaseLlm:
    """Returns the configured model, or test override if set."""
    if _agent_model_override is not None:
        return _agent_model_override
    settings = get_settings()
    return settings.gemini_model


def set_agent_model_override(model: str | BaseLlm | None) -> None:
    """Helper for testing to inject scripted or mock models."""
    global _agent_model_override
    _agent_model_override = model


@router.post("", response_class=StreamingResponse)
async def agent_turn(
    request_body: AgentRequest,
    req: Request,
    response: Response,
    persona_sid: Annotated[str | None, Cookie()] = None,
    x_persona_chaos: Annotated[str | None, Header()] = None,
    chaos: Annotated[str | None, Query()] = None,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,  # type: ignore[assignment]
    cart_service: Annotated[VerifiedCartService, Depends(get_verified_cart_service)] = None,  # type: ignore[assignment]
    model: Annotated[str | BaseLlm, Depends(get_agent_model)] = None,  # type: ignore[assignment]
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> Response:
    settings = settings or get_settings()

    # Session ID resolution
    session_id = persona_sid or "default"
    effective_chaos = resolve_chaos(
        chaos_param=chaos,
        chaos_header=x_persona_chaos,
        env_rate=settings.persona_failure_rate,
    )

    # 1. Fallback & config check
    if _agent_model_override is None:
        if settings.agent_backend == "mock":
            return JSONResponse(
                status_code=503,
                content={
                    "error": {
                        "code": "AGENT_MOCK",
                        "message": "AGENT_BACKEND is mock. Fall back to frontend mockAgent.",
                    }
                },
            )
        if settings.agent_backend == "gemini" and not settings.gemini_api_key:
            return JSONResponse(
                status_code=503,
                content={
                    "error": {
                        "code": "SERVICE_UNAVAILABLE",
                        "message": "GEMINI_API_KEY is not configured on the backend.",
                    }
                },
            )

    # 2. Rate limit check
    if not check_rate_limit(session_id, limit=settings.agent_rate_limit_per_minute):
        return JSONResponse(
            status_code=429,
            content={"error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests. Please wait a moment."}},
        )

    # 3. Log without exposing user message text or keys
    logger.info("Agent turn started for session %s (msg_len=%d)", session_id, len(request_body.message))

    # 4. Turn context setup
    turn_ctx = AgentTurnContext(
        session_id=session_id,
        catalog_service=catalog_service,
        verified_cart_service=cart_service,
        chaos=effective_chaos,
        force_silent_drop=(chaos == "silent" or x_persona_chaos == "silent"),
    )

    agent = create_pip_agent(model=model)

    generator = run_pip_stream(
        request=request_body,
        turn_ctx=turn_ctx,
        agent=agent,
        session_provider=_session_provider_instance,
    )

    return StreamingResponse(
        generator,
        media_type="application/x-ndjson; charset=utf-8",
        headers={
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
