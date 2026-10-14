import { getProduct } from "@/lib/commerce/catalog";
import type { Category } from "@/lib/commerce/schemas";

/**
 * Proactive nudges: explicit, tunable rules over shopping signals recorded this session.
 * Pure and deterministic. The caller supplies `now` and the session bookkeeping.
 *
 * Only real shopping actions are signals. Mouse inactivity/idle time is never one,
 * so it can never trigger a nudge.
 */

export type SignalEvent =
  | { type: "view"; productId: string; at: number }
  | { type: "filter"; key: string; at: number }
  | { type: "cart_add"; productId: string; at: number }
  | { type: "cart_remove"; productId: string; at: number }
  | { type: "compare_toggle"; productId: string; added: boolean; at: number };

export type NudgeType = "revisit" | "alternate" | "price_thrash" | "removed";

export interface NudgeAction {
  label: string;
  /** Sent to Pip as a user message when chosen. */
  message: string;
}

export interface Nudge {
  type: NudgeType;
  /** Dedupe key: each subject nudges at most once per session. */
  key: string;
  text: string;
  actions: NudgeAction[];
  productIds: string[];
}

export const NUDGE_CONFIG = {
  /** Rule 1: same product viewed this many times. */
  revisitViews: 3,
  /** Rule 2: switches between the same two products (A→B→A = 2). */
  alternations: 2,
  /** Rule 3: price filter changes within the window. */
  priceChanges: 3,
  priceWindowMs: 60_000,
  /** Rule 4: how fresh a cart removal must be. */
  removalFreshMs: 15_000,
  /** At most one nudge per this interval. */
  cooldownMs: 90_000,
  /** Never nudge while the user is typing (or typed this recently). */
  typingQuietMs: 4_000,
} as const;

export type NudgeConfig = typeof NUDGE_CONFIG;

export interface EngineInput {
  events: SignalEvent[];
  now: number;
  firedKeys: string[];
  dismissedTypes: NudgeType[];
  lastNudgeAt: number | null;
  lastTypingAt: number;
  paused: boolean;
  /** Chat open / agent working: the user is already talking to Pip. */
  busy: boolean;
  category: Category | null;
}

export type Decision =
  | { show: Nudge }
  | { blocked: "paused" | "busy" | "cooldown" | "typing"; candidate: Nudge; retryAt?: number }
  | null;

const nameOf = (id: string) => getProduct(id)?.name ?? "that product";

function viewSequence(events: SignalEvent[]): string[] {
  const seq: string[] = [];
  for (const e of events) if (e.type === "view" && seq[seq.length - 1] !== e.productId) seq.push(e.productId);
  return seq;
}

/** All rules that currently match, highest priority first. */
export function candidates(input: Pick<EngineInput, "events" | "now" | "category">, cfg: NudgeConfig = NUDGE_CONFIG): Nudge[] {
  const { events, now } = input;
  const out: Nudge[] = [];
  const last = events[events.length - 1];

  // 4. Item removed from cart → cheaper alternative.
  if (last?.type === "cart_remove" && now - last.at <= cfg.removalFreshMs) {
    const n = nameOf(last.productId);
    out.push({
      type: "removed",
      key: `removed:${last.productId}`,
      text: `Changed your mind on the ${n}? Want a cheaper alternative?`,
      actions: [{ label: "Find a cheaper one", message: `Find a cheaper alternative to the ${n}` }],
      productIds: [last.productId],
    });
  }

  // 2. Two products alternated between → side-by-side.
  const seq = viewSequence(events);
  if (last?.type === "view" && seq.length >= 3) {
    const a = seq[seq.length - 1];
    const b = seq[seq.length - 2];
    let i = seq.length - 1;
    while (i >= 0 && (seq[i] === a || seq[i] === b)) i--;
    const switches = seq.length - 1 - i - 1;
    if (switches >= cfg.alternations) {
      const [x, y] = [a, b].sort();
      out.push({
        type: "alternate",
        key: `alternate:${x}|${y}`,
        text: `Torn between the ${nameOf(b)} and the ${nameOf(a)}? I can put them side by side.`,
        actions: [{ label: "Compare them", message: `Compare the ${nameOf(b)} and the ${nameOf(a)}` }],
        productIds: [b, a],
      });
    }
  }

  // 1. Same product viewed N+ times → compare with similar ones.
  if (last?.type === "view") {
    const views = events.filter((e) => e.type === "view" && e.productId === last.productId).length;
    if (views >= cfg.revisitViews) {
      const n = nameOf(last.productId);
      out.push({
        type: "revisit",
        key: `revisit:${last.productId}`,
        text: `You keep coming back to the ${n}. Want me to compare it with similar ones?`,
        actions: [{ label: "Compare with similar", message: `Compare the ${n} with similar ones` }],
        productIds: [last.productId],
      });
    }
  }

  // 3. Price filter changed N+ times within the window → ask what matters most.
  const priceChanges = events.filter((e) => e.type === "filter" && e.key === "priceRange" && now - e.at <= cfg.priceWindowMs).length;
  if (last?.type === "filter" && last.key === "priceRange" && priceChanges >= cfg.priceChanges) {
    const cat = input.category ?? "laptops";
    out.push({
      type: "price_thrash",
      key: "price_thrash",
      text: "Juggling the price range? Should I prioritise price, performance, or battery?",
      actions: [
        { label: "Price", message: `Show me the best value ${cat}` },
        { label: "Performance", message: `Show the top rated ${cat}` },
        { label: "Battery", message: `${cat} with the best battery life` },
      ],
      productIds: [],
    });
  }

  return out;
}

/** Picks at most one nudge and applies the gating rules. */
export function evaluate(input: EngineInput, cfg: NudgeConfig = NUDGE_CONFIG): Decision {
  const candidate = candidates(input, cfg).find((n) => !input.firedKeys.includes(n.key) && !input.dismissedTypes.includes(n.type));
  if (!candidate) return null;
  if (input.paused) return { blocked: "paused", candidate };
  if (input.busy) return { blocked: "busy", candidate };
  if (input.lastNudgeAt !== null && input.now - input.lastNudgeAt < cfg.cooldownMs) return { blocked: "cooldown", candidate };
  if (input.now - input.lastTypingAt < cfg.typingQuietMs) return { blocked: "typing", candidate, retryAt: input.lastTypingAt + cfg.typingQuietMs };
  return { show: candidate };
}
