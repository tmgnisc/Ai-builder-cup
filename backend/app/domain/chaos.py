import asyncio
import random
from typing import Literal

from pydantic import BaseModel

ChaosFailure = Literal["transient", "silent"]
MAX_FAILURE_RATE = 0.9


class ChaosConfig(BaseModel):
    latency_min: int
    latency_max: int
    failure_rate: float


def _parse_num(value: str | float | int | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = value.strip()
    if not s:
        return None
    try:
        val = float(s)
        return val if val == val else None  # Check for NaN
    except ValueError:
        return None


def resolve_chaos(
    chaos_param: float | str | None = None,
    latency_param: int | str | None = None,
    chaos_header: str | None = None,
    latency_header: str | None = None,
    env_rate: float = 0.0,
    env_min: int = 200,
    env_max: int = 600,
) -> ChaosConfig:
    parsed_req_chaos = _parse_num(chaos_param) if chaos_param is not None else _parse_num(chaos_header)
    rate = parsed_req_chaos if parsed_req_chaos is not None else env_rate
    failure_rate = min(MAX_FAILURE_RATE, max(0.0, rate))

    parsed_latency = _parse_num(latency_param) if latency_param is not None else _parse_num(latency_header)
    if parsed_latency is not None:
        min_ms = int(parsed_latency)
        max_ms = int(parsed_latency)
    else:
        min_ms = env_min
        max_ms = env_max

    min_val = max(0, min_ms)
    max_val = max(min_val, max_ms)

    return ChaosConfig(
        latency_min=min_val,
        latency_max=max_val,
        failure_rate=failure_rate,
    )


async def simulate_latency(cfg: ChaosConfig) -> int:
    if cfg.latency_max <= 0:
        return 0
    ms = round(cfg.latency_min + random.random() * (cfg.latency_max - cfg.latency_min))
    if ms <= 0:
        return 0
    await asyncio.sleep(ms / 1000.0)
    return ms


def roll_failure(cfg: ChaosConfig, mutation: bool) -> ChaosFailure | None:
    if cfg.failure_rate <= 0 or random.random() >= cfg.failure_rate:
        return None
    if not mutation:
        return "transient"
    return "transient" if random.random() < 0.5 else "silent"
