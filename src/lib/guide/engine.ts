import type { Nudge } from "@/lib/signals/nudgeEngine";
import { buildTip, CHECKINS, INTROS, type PageType, type Tip, type TipCtx } from "./tips";

/**
 * Proactive guide engine. Pure: the hook feeds it a trigger, the session state and the live
 * gates; it answers with what to say (or why it stays quiet). Agent replies always win.
 */

export const GUIDE_CONFIG = {
  idleMs: 3000,
  idleMsMobile: 5000,
  dwellMs: 1500,
  /** Min gap between proactive bubbles (spec said ≥ 8 s; 15 s felt less pushy). */
  cooldownMs: 15_000,
  /** Extra quiet time after the user dismisses a proactive bubble. */
  afterDismissMs: 20_000,
  /** Dismissals in a row before Pip goes quiet by itself. */
  dismissesToQuiet: 3,
  /** Min gap between a page intro and the next element tip (intros are orientation, not tips). */
  afterIntroMs: 6_000,
  /** Topics that may speak up when they scroll into view. */
  scrollTopics: ["delivery", "compare-verdict"],
} as const;

export type Trigger =
  | { kind: "route"; page: PageType }
  /** Idle with nothing element-specific left to say: "is something in your way?" */
  | { kind: "checkin"; page: PageType }
  | { kind: "idle" | "dwell" | "scroll"; anchor: { id: string; topic: string; productId: string | null } }
  | { kind: "behaviour"; nudge: Nudge };

export interface GuideState {
  seenTipIds: string[];
  /** Escalation level reached per anchor id (0 = never spoken about). */
  ladder: Record<string, number>;
  introsSeen: PageType[];
  lastProactiveAt: number | null;
  lastIntroAt: number | null;
  lastDismissAt: number | null;
  dismissStreak: number;
  quiet: boolean;
  paused: boolean;
}

export interface Gates {
  now: number;
  typing: boolean;
  dragging: boolean;
  scrolling: boolean;
  /** A drawer/modal has focus. */
  modalFocused: boolean;
  /** The agent is working, or the bubble shows an agent reply / actions the user hasn't acted on. */
  bubbleBusy: boolean;
}

export type Blocked = "quiet" | "paused" | "typing" | "dragging" | "scrolling" | "modal" | "bubble" | "cooldown" | "after-dismiss" | "exhausted" | "nothing";

export type GuideDecision =
  | { show: Tip; level: 0 | 1 | 2; anchorId: string | null; ladderKey: string | null; spotlight: boolean }
  | { blocked: Blocked };

export function emptyGuideState(): GuideState {
  return { seenTipIds: [], ladder: {}, introsSeen: [], lastProactiveAt: null, lastIntroAt: null, lastDismissAt: null, dismissStreak: 0, quiet: false, paused: false };
}

export function decide(trigger: Trigger, state: GuideState, gates: Gates, ctx: TipCtx, cfg = GUIDE_CONFIG): GuideDecision {
  if (state.paused) return { blocked: "paused" };
  if (state.quiet) return { blocked: "quiet" };
  if (gates.typing) return { blocked: "typing" };
  if (gates.dragging) return { blocked: "dragging" };
  if (gates.scrolling && trigger.kind !== "scroll") return { blocked: "scrolling" };
  if (gates.modalFocused) return { blocked: "modal" };
  if (gates.bubbleBusy) return { blocked: "bubble" };
  if (state.lastDismissAt !== null && gates.now - state.lastDismissAt < cfg.afterDismissMs) return { blocked: "after-dismiss" };
  // Page intros are the one thing allowed sooner than the general cooldown.
  if (trigger.kind !== "route" && state.lastProactiveAt !== null && gates.now - state.lastProactiveAt < cfg.cooldownMs) return { blocked: "cooldown" };
  if (trigger.kind !== "route" && state.lastIntroAt !== null && gates.now - state.lastIntroAt < cfg.afterIntroMs) return { blocked: "cooldown" };

  const fresh = (tip: Tip | null) => (tip && !state.seenTipIds.includes(tip.id) ? tip : null);

  switch (trigger.kind) {
    case "route": {
      if (state.introsSeen.includes(trigger.page)) return { blocked: "exhausted" };
      const tip = fresh(INTROS[trigger.page]?.({ ...ctx, seenTipIds: state.seenTipIds }) ?? null);
      return tip ? { show: tip, level: 0, anchorId: null, ladderKey: null, spotlight: false } : { blocked: "nothing" };
    }
    case "checkin": {
      const tip = fresh(CHECKINS[trigger.page]?.(ctx) ?? null);
      return tip ? { show: tip, level: 2, anchorId: null, ladderKey: null, spotlight: false } : { blocked: "exhausted" };
    }
    case "behaviour": {
      const n = trigger.nudge;
      const tip: Tip = {
        id: `behaviour:${n.key}`,
        text: n.text,
        chips: [...n.actions.map((a) => ({ label: a.label, message: a.message })), { label: "Not now" }],
        productIds: n.productIds.length === 1 ? n.productIds : undefined,
      };
      if (!fresh(tip)) return { blocked: "exhausted" };
      const anchorId = n.productIds.length ? `card:${n.productIds[n.productIds.length - 1]}` : null;
      return { show: tip, level: 2, anchorId, ladderKey: null, spotlight: false };
    }
    case "idle":
    case "dwell":
    case "scroll": {
      const a = trigger.anchor;
      if (trigger.kind === "scroll" && !(cfg.scrollTopics as readonly string[]).includes(a.topic)) return { blocked: "nothing" };
      const reached = state.ladder[a.id] ?? 0;
      if (reached >= 2) return { blocked: "exhausted" };
      // Scroll arrivals only ever give the gentle first-level tip.
      if (trigger.kind === "scroll" && reached >= 1) return { blocked: "exhausted" };
      for (const level of reached === 0 ? ([1, 2] as const) : ([2] as const)) {
        const tip = fresh(buildTip(a.topic, level, ctx));
        if (tip) return { show: tip, level, anchorId: a.id, ladderKey: a.id, spotlight: true };
        if (trigger.kind === "scroll") break;
      }
      return { blocked: "nothing" };
    }
  }
}

/** State update after a tip is shown. */
export function afterShow(state: GuideState, d: Extract<GuideDecision, { show: Tip }>, trigger: Trigger, now: number): GuideState {
  return {
    ...state,
    seenTipIds: [...state.seenTipIds, d.show.id],
    ladder: d.ladderKey ? { ...state.ladder, [d.ladderKey]: Math.max(state.ladder[d.ladderKey] ?? 0, d.level) } : state.ladder,
    introsSeen: trigger.kind === "route" ? [...state.introsSeen, trigger.page] : state.introsSeen,
    lastProactiveAt: trigger.kind === "route" ? state.lastProactiveAt : now,
    lastIntroAt: trigger.kind === "route" ? now : state.lastIntroAt,
  };
}

/** State update when a proactive bubble closes. Returns whether Pip should now go quiet. */
export function afterClose(state: GuideState, reason: "user" | "timeout" | "replaced" | "system" | "engaged", now: number, cfg = GUIDE_CONFIG): { state: GuideState; goQuiet: boolean } {
  if (reason === "engaged") return { state: { ...state, dismissStreak: 0 }, goQuiet: false };
  if (reason !== "user") return { state, goQuiet: false };
  const dismissStreak = state.dismissStreak + 1;
  const goQuiet = dismissStreak >= cfg.dismissesToQuiet;
  return { state: { ...state, dismissStreak: goQuiet ? 0 : dismissStreak, lastDismissAt: now, quiet: goQuiet || state.quiet }, goQuiet };
}
