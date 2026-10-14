/**
 * Latency + failure simulation for the mock commerce API.
 *
 * Defaults: 200–600 ms latency, 0% failure (demo-safe). Out-of-stock errors are always
 * deterministic and come from catalog data, never from chaos.
 *
 * Overrides (per request):
 *   ?chaos=0.1            or header `x-persona-chaos: 0.1`   → 10% failure rate
 *   ?latency=0            or header `x-persona-latency: 0`   → disable latency (tests)
 * Env: PERSONA_FAILURE_RATE, PERSONA_LATENCY_MIN_MS, PERSONA_LATENCY_MAX_MS
 */

export interface ChaosConfig {
  latencyMin: number;
  latencyMax: number;
  failureRate: number;
}

/**
 * - `transient`: the request fails loudly (HTTP 503).
 * - `silent`: a mutation reports success but is not persisted, which only verify-after-act catches.
 */
export type ChaosFailure = "transient" | "silent";

const MAX_FAILURE_RATE = 0.9;

function num(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function resolveChaos(req: Request): ChaosConfig {
  const url = new URL(req.url);
  const envRate = num(process.env.PERSONA_FAILURE_RATE) ?? 0;
  const reqRate = num(url.searchParams.get("chaos")) ?? num(req.headers.get("x-persona-chaos"));
  const failureRate = Math.min(MAX_FAILURE_RATE, Math.max(0, reqRate ?? envRate));

  const latencyOverride = num(url.searchParams.get("latency")) ?? num(req.headers.get("x-persona-latency"));
  const min = latencyOverride ?? num(process.env.PERSONA_LATENCY_MIN_MS) ?? 200;
  const max = latencyOverride ?? num(process.env.PERSONA_LATENCY_MAX_MS) ?? 600;

  return { latencyMin: Math.max(0, min), latencyMax: Math.max(min, max), failureRate };
}

export function simulateLatency(cfg: ChaosConfig): Promise<number> {
  const ms = Math.round(cfg.latencyMin + Math.random() * (cfg.latencyMax - cfg.latencyMin));
  if (ms === 0) return Promise.resolve(0);
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}

export function rollFailure(cfg: ChaosConfig, { mutation }: { mutation: boolean }): ChaosFailure | null {
  if (cfg.failureRate <= 0 || Math.random() >= cfg.failureRate) return null;
  if (!mutation) return "transient";
  return Math.random() < 0.5 ? "transient" : "silent";
}
