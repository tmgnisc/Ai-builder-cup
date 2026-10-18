"""Shopper telemetry and the merchant analytics computed from it.

The storefront reports what shoppers actually do (visits, messages to Pip, verified cart writes,
tips, checkout...) as events. Everything on the merchant dashboard that isn't a plain database
count (orders, stock) is aggregated from these events on read, so there is no seeded or
hardcoded analytics data anywhere.
"""

import re
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..models.db import AnalyticsEventDB

PERIOD_DAYS = 7
PERIOD_LABEL = "Last 7 days"

EVENT_KINDS = frozenset(
    {
        "visit",  # first page view of a browser session
        "pip_message",  # shopper sent Pip a message {text, intent?}
        "recommendation",  # Pip showed products {productIds}
        "compare",  # comparison opened {productIds}
        "cart_verified",  # cart write confirmed by a fresh read {productId}
        "cart_failed",  # cart write that didn't stick; Pip said so {productId}
        "checkout_started",
        "order_placed",  # {orderId, totalNPR}
        "tip_shown",  # proactive tip {topic}
        "tip_engaged",  # shopper clicked or replied to a tip {topic}
        "friction",  # answer to "Something's confusing" {text, page}
        "missing_info",  # spec Pip couldn't answer from the catalog {productId, field, question}
    }
)

# A conversation counts as "task done" when the shopper got to one of these afterwards.
TASK_DONE_KINDS = frozenset({"cart_verified", "compare", "checkout_started", "order_placed"})

MAX_STRING = 200
MAX_LIST = 8


@dataclass(frozen=True)
class AnalyticsEvent:
    session_id: str
    kind: str
    data: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def sanitize_data(data: dict[str, Any] | None) -> dict[str, Any]:
    """Keeps only short scalars and short lists of strings, so the table can't be used as a blob store."""
    clean: dict[str, Any] = {}
    for key, value in (data or {}).items():
        if len(clean) >= 8 or not isinstance(key, str) or len(key) > 32:
            continue
        if isinstance(value, str):
            clean[key] = value.strip()[:MAX_STRING]
        elif isinstance(value, bool | int | float):
            clean[key] = value
        elif isinstance(value, list):
            clean[key] = [str(v)[:MAX_STRING] for v in value[:MAX_LIST] if isinstance(v, str | int)]
    return clean


class AnalyticsRepository(Protocol):
    async def record(self, event: AnalyticsEvent) -> None: ...

    async def since(self, start: datetime) -> list[AnalyticsEvent]: ...


class InMemoryAnalyticsRepository:
    """Used when no DATABASE_URL is configured. Bounded so a long-running dev server can't grow forever."""

    def __init__(self, max_events: int = 50_000) -> None:
        self._events: list[AnalyticsEvent] = []
        self._max = max_events

    async def record(self, event: AnalyticsEvent) -> None:
        self._events.append(event)
        if len(self._events) > self._max:
            del self._events[: len(self._events) - self._max]

    async def since(self, start: datetime) -> list[AnalyticsEvent]:
        return [e for e in self._events if e.created_at >= start]

    def clear(self) -> None:
        self._events.clear()


class PostgresAnalyticsRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = session_factory

    async def record(self, event: AnalyticsEvent) -> None:
        async with self._factory() as session:
            session.add(
                AnalyticsEventDB(
                    session_id=event.session_id, kind=event.kind, data=event.data, created_at=event.created_at
                )
            )
            await session.commit()

    async def since(self, start: datetime) -> list[AnalyticsEvent]:
        async with self._factory() as session:
            stmt = (
                select(AnalyticsEventDB)
                .where(AnalyticsEventDB.created_at >= start)
                .order_by(AnalyticsEventDB.created_at)
                .limit(200_000)
            )
            rows = (await session.execute(stmt)).scalars().all()
            return [
                AnalyticsEvent(session_id=r.session_id, kind=r.kind, data=dict(r.data or {}), created_at=r.created_at)
                for r in rows
            ]


# ── Aggregation (pure) ──────────────────────────────────────────────────────────


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text.lower())).strip()


def _day_index(ts: datetime, end: datetime) -> int:
    """0 = oldest day of the period, PERIOD_DAYS-1 = the last 24 hours."""
    return PERIOD_DAYS - 1 - int((end - ts).total_seconds() // 86_400)


def _sessions(events: Iterable[AnalyticsEvent], kinds: frozenset[str] | set[str]) -> set[str]:
    return {e.session_id for e in events if e.kind in kinds}


def _completion(events: list[AnalyticsEvent]) -> tuple[int, int]:
    """(sessions that talked to Pip, of those the ones that reached a task-done event afterwards)."""
    first_talk: dict[str, datetime] = {}
    for e in events:
        if e.kind == "pip_message" and e.session_id not in first_talk:
            first_talk[e.session_id] = e.created_at
    done = {
        e.session_id
        for e in events
        if e.kind in TASK_DONE_KINDS and e.session_id in first_talk and e.created_at >= first_talk[e.session_id]
    }
    return len(first_talk), len(done)


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def _kpis(cur: list[AnalyticsEvent], prev: list[AnalyticsEvent], end: datetime) -> list[dict[str, Any]]:
    daily: list[list[AnalyticsEvent]] = [[] for _ in range(PERIOD_DAYS)]
    for e in cur:
        i = _day_index(e.created_at, end)
        if 0 <= i < PERIOD_DAYS:
            daily[i].append(e)

    assisted_kinds = {"pip_message", "tip_engaged"}

    def assisted(evs: list[AnalyticsEvent]) -> int:
        return len(_sessions(evs, assisted_kinds))

    def completion(evs: list[AnalyticsEvent]) -> float:
        talked, done = _completion(evs)
        return _pct(done, talked)

    def verified(evs: list[AnalyticsEvent]) -> float:
        ok = sum(1 for e in evs if e.kind == "cart_verified")
        failed = sum(1 for e in evs if e.kind == "cart_failed")
        return _pct(ok, ok + failed)

    def tips(evs: list[AnalyticsEvent]) -> float:
        shown = sum(1 for e in evs if e.kind == "tip_shown")
        engaged = sum(1 for e in evs if e.kind == "tip_engaged")
        return min(100.0, _pct(engaged, shown))

    a_cur, a_prev = assisted(cur), assisted(prev)
    ok = sum(1 for e in cur if e.kind == "cart_verified")
    failed = sum(1 for e in cur if e.kind == "cart_failed")
    talked, done = _completion(cur)
    shown = sum(1 for e in cur if e.kind == "tip_shown")
    engaged = sum(1 for e in cur if e.kind == "tip_engaged")

    return [
        {
            "key": "assisted",
            "label": "Assisted sessions",
            "value": a_cur,
            "format": "int",
            # % change for counts; no baseline means no meaningful change.
            "delta": round((a_cur - a_prev) / a_prev * 100) if a_prev else 0,
            "hint": "Sessions where the shopper talked to Pip or used a tip",
            "trend": [assisted(d) for d in daily],
        },
        {
            "key": "completion",
            "label": "Task completion",
            "value": completion(cur),
            "format": "pct",
            "delta": round(completion(cur) - completion(prev), 1),
            "hint": f"{done} of {talked} Pip conversations ended in a verified add, a comparison or checkout",
            "trend": [completion(d) for d in daily],
        },
        {
            "key": "verified",
            "label": "Cart actions verified",
            "value": verified(cur),
            "format": "pct",
            "delta": round(verified(cur) - verified(prev), 1),
            "hint": (
                f"{ok} of {ok + failed} cart changes confirmed by a fresh read; "
                f"Pip reported the other {failed} honestly"
            ),
            "trend": [verified(d) for d in daily],
        },
        {
            "key": "tips",
            "label": "Tips engaged",
            "value": tips(cur),
            "format": "pct",
            "delta": round(tips(cur) - tips(prev), 1),
            "hint": f"{engaged} of {shown} proactive tips clicked or replied to",
            "trend": [tips(d) for d in daily],
        },
    ]


FUNNEL_STEPS = [
    ("visited", "Visited the store", {"visit"}),
    ("talked", "Talked to Pip", {"pip_message"}),
    ("recommended", "Saw recommendations", {"recommendation"}),
    ("compared", "Compared products", {"compare"}),
    ("added", "Added to cart (verified)", {"cart_verified"}),
    ("checkout", "Started checkout", {"checkout_started"}),
]


def _top_questions(events: list[AnalyticsEvent], limit: int = 6) -> list[dict[str, Any]]:
    groups: dict[str, list[AnalyticsEvent]] = defaultdict(list)
    for e in events:
        if e.kind == "pip_message" and isinstance(e.data.get("text"), str):
            key = _normalize(e.data["text"])
            if len(key) >= 3:
                groups[key].append(e)

    done_after: dict[str, datetime] = {}
    for e in events:
        if e.kind in TASK_DONE_KINDS:
            done_after[e.session_id] = max(done_after.get(e.session_id, e.created_at), e.created_at)

    ranked = sorted(groups.values(), key=lambda g: (len(g), g[-1].created_at), reverse=True)[:limit]
    out = []
    for g in ranked:
        sessions = {e.session_id for e in g}
        resolved = sum(
            1 for s in sessions if any(e.session_id == s and done_after.get(s, e.created_at) > e.created_at for e in g)
        )
        intents = Counter(str(e.data.get("intent") or "question") for e in g)
        out.append(
            {
                "text": g[-1].data["text"],
                "count": len(g),
                "intent": intents.most_common(1)[0][0],
                "resolved": round(resolved / len(sessions), 2) if sessions else 0.0,
            }
        )
    return out


def _friction(events: list[AnalyticsEvent], limit: int = 6) -> list[dict[str, Any]]:
    groups: dict[str, list[AnalyticsEvent]] = defaultdict(list)
    for e in events:
        if e.kind == "friction" and isinstance(e.data.get("text"), str) and e.data["text"].strip():
            groups[_normalize(e.data["text"])].append(e)
    ranked = sorted(groups.values(), key=lambda g: (len(g), g[-1].created_at), reverse=True)[:limit]
    return [
        {
            "text": g[-1].data["text"],
            "count": len(g),
            "page": Counter(str(e.data.get("page") or "Store") for e in g).most_common(1)[0][0],
        }
        for g in ranked
    ]


def missing_info(events: list[AnalyticsEvent], limit: int = 20) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], list[AnalyticsEvent]] = defaultdict(list)
    for e in events:
        pid, fld = e.data.get("productId"), e.data.get("field")
        if e.kind == "missing_info" and isinstance(pid, str) and isinstance(fld, str) and fld.strip():
            groups[(pid, fld.strip().lower())].append(e)
    ranked = sorted(groups.values(), key=lambda g: (len(g), g[-1].created_at), reverse=True)[:limit]
    out = []
    for g in ranked:
        last = g[-1]
        field_name = str(last.data["field"]).strip()
        question = next((str(e.data["question"]) for e in reversed(g) if e.data.get("question")), None)
        out.append(
            {
                "productId": last.data["productId"],
                "field": field_name,
                "asks": len(g),
                "example": question or f"What about the {field_name.lower()}?",
                "lastAskedAt": last.created_at.isoformat(),
            }
        )
    return out


def aggregate(events: list[AnalyticsEvent], now: datetime | None = None) -> dict[str, Any]:
    """Merchant analytics for the last PERIOD_DAYS days, with the period before as the baseline."""
    end = now or datetime.now(timezone.utc)
    start = end - timedelta(days=PERIOD_DAYS)
    cur = [e for e in events if start <= e.created_at <= end]
    prev = [e for e in events if start - timedelta(days=PERIOD_DAYS) <= e.created_at < start]

    ok = sum(1 for e in cur if e.kind == "cart_verified")
    failed = sum(1 for e in cur if e.kind == "cart_failed")
    return {
        "period": PERIOD_LABEL,
        "totalEvents": len(cur),
        "kpis": _kpis(cur, prev, end),
        "cartActions": {"total": ok + failed, "verified": ok, "caught": failed},
        "funnel": [{"key": k, "label": label, "value": len(_sessions(cur, kinds))} for k, label, kinds in FUNNEL_STEPS],
        "topQuestions": _top_questions(cur),
        "frictionThemes": _friction(cur),
        "missingInfo": missing_info(cur),
    }


def analytics_window_start(now: datetime | None = None) -> datetime:
    """Earliest timestamp aggregate() needs (current period plus its baseline)."""
    return (now or datetime.now(timezone.utc)) - timedelta(days=PERIOD_DAYS * 2)
