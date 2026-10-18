import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from ...core.errors import CommerceException
from ...services.analytics import EVENT_KINDS, AnalyticsEvent, AnalyticsRepository, sanitize_data
from ..dependencies import get_analytics_repository, verify_shared_secret

router = APIRouter(prefix="/api/events", tags=["events"])

_RATE_LIMIT = 120
_RATE_WINDOW = 60.0
_MAX_TRACKED_SESSIONS = 10_000
_recent: dict[str, list[float]] = {}


def _allow(session_id: str) -> bool:
    """Per-session sliding window; the table is bounded so abandoned sessions can't leak memory."""
    now = time.monotonic()
    if len(_recent) > _MAX_TRACKED_SESSIONS:
        _recent.clear()
    active = [t for t in _recent.get(session_id, []) if now - t < _RATE_WINDOW]
    if len(active) >= _RATE_LIMIT:
        _recent[session_id] = active
        return False
    active.append(now)
    _recent[session_id] = active
    return True


class EventInput(BaseModel):
    sessionId: str = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    kind: str = Field(max_length=32)
    data: dict[str, Any] | None = None


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def record_event(
    payload: EventInput,
    repo: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
    _: Annotated[None, Depends(verify_shared_secret)] = None,
) -> dict[str, bool]:
    """Records one shopper telemetry event (see services/analytics.py for the kinds)."""
    if payload.kind not in EVENT_KINDS:
        raise CommerceException("INVALID_INPUT", f"Unknown event kind '{payload.kind}'.")
    if not _allow(payload.sessionId):
        return {"accepted": False}
    await repo.record(AnalyticsEvent(session_id=payload.sessionId, kind=payload.kind, data=sanitize_data(payload.data)))
    return {"accepted": True}
