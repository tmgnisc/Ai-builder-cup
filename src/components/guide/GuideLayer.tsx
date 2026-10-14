"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import * as pilot from "@/components/companion/pilot";
import { pip, pipRuntime } from "@/components/companion/runtime";
import { getProduct } from "@/lib/commerce/catalog";
import { anchorAt, getAnchors, mostVisibleAnchor, startAnchorRegistry, subscribeAnchors, type AnchorInfo } from "@/lib/guide/anchors";
import { afterClose, afterShow, decide, GUIDE_CONFIG, type GuideDecision, type Trigger } from "@/lib/guide/engine";
import type { PageType, TipCtx } from "@/lib/guide/tips";
import { candidates } from "@/lib/signals/nudgeEngine";
import { useShoppingSignals } from "@/lib/signals/useShoppingSignals";
import { useBubble } from "@/store/useBubble";
import { useCart } from "@/store/useCart";
import { useCatalogUI } from "@/store/useCatalogUI";
import { useChat } from "@/store/useChat";
import { useFeedback } from "@/store/useFeedback";
import { tourDone, useGuide } from "@/store/useGuide";
import { usePipPosition } from "@/store/usePipPosition";
import { useSignals } from "@/store/useSignals";
import { useSpotlight } from "./Spotlight";
import { offerTour } from "./tour";

const SKIP_TOPICS = new Set(["stage"]);

const isMobile = () => window.innerWidth < 768;
/** Idle decisions worth retrying while the user is still idle (the gate opens by itself). */
const RETRY_IDLE = new Set(["cooldown", "after-dismiss", "bubble", "scrolling"]);

/** "Something's confusing": Pip asks what's in the way, records it, then helps with it. */
function askFeedback() {
  useBubble.getState().show(
    {
      kind: "tip",
      id: `feedback:${Date.now()}`,
      source: "guide",
      text: "What's getting in the way? A few words is enough. I'll help, and the store team sees it so they can fix it.",
      onReply: (text) => {
        useFeedback.getState().add(text);
        return false; // still goes to the agent, so Pip answers it
      },
    },
    { input: true },
  );
}

function pageType(pathname: string): PageType {
  if (useCart.getState().drawerOpen) return "cart";
  if (pathname === "/") return useCatalogUI.getState().filters.category ? "category" : "home";
  if (pathname.startsWith("/product/")) return "product";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/merchant")) return "merchant";
  return "other";
}

function tipContext(page: PageType, anchor: AnchorInfo | null): TipCtx {
  const pathProduct = window.location.pathname.match(/^\/product\/([a-z0-9-]+)/)?.[1] ?? null;
  const productId = anchor?.productId ?? pathProduct;
  const product = productId ? (getProduct(productId) ?? null) : null;
  const cart = useCart.getState().cart;
  return {
    page,
    anchor: anchor ? { id: anchor.id, topic: anchor.topic, productId: anchor.productId } : null,
    product,
    category: product?.category ?? useCatalogUI.getState().filters.category,
    cart: { count: cart?.itemCount ?? 0, subtotal: cart?.subtotal ?? 0 },
  };
}

const isTypingTarget = (el: Element | null) => {
  const h = el as HTMLElement | null;
  return !!h && (h.tagName === "INPUT" || h.tagName === "TEXTAREA" || h.tagName === "SELECT" || h.isContentEditable);
};

/**
 * Pip's proactive guide: turns what the user is doing into triggers (page arrival, idle,
 * hover dwell, scroll arrival, behaviour signals), asks the pure engine whether to speak,
 * then flies Pip beside the element, rings it, and talks through the bubble.
 */
export function GuideLayer() {
  const pathname = usePathname();
  useShoppingSignals();

  useEffect(() => {
    startAnchorRegistry();
    const act = { last: performance.now(), interacted: false, idleStage: 0 as 0 | 1 | 2, idleTry: 0, lastScroll: 0 };
    const dwell = { id: null as string | null, since: 0, fired: false };
    const arrived = new Set<string>();
    const pendingScroll: AnchorInfo[] = [];

    const gates = () => {
      const now = Date.now();
      const active = document.activeElement;
      const bubble = useBubble.getState().content;
      const bubbleBusy =
        useChat.getState().busy ||
        useGuide.getState().tourStep !== null ||
        (!!bubble && (bubble.kind !== "tip" || !!bubble.chips?.length || !!bubble.productIds?.length));
      return {
        now,
        typing: isTypingTarget(active) || now - useSignals.getState().lastTypingAt < 4000,
        dragging: pilot.getMode() === "dragging",
        scrolling: performance.now() - act.lastScroll < 400,
        modalFocused: !!active?.closest("[data-sheet-open='true'][aria-modal='true']"),
        bubbleBusy,
      };
    };

    const TRANSIENT = new Set(["typing", "scrolling", "bubble", "dragging", "modal"]);
    const fire = (trigger: Trigger, attempt = 0): GuideDecision => {
      const store = useGuide.getState();
      const sig = useSignals.getState();
      const state = { ...store.state, quiet: sig.quiet, paused: sig.paused };
      const anchorInfo = "anchor" in trigger ? (getAnchors().find((a) => a.id === trigger.anchor.id) ?? null) : null;
      const page = pageType(window.location.pathname);
      const d: GuideDecision = decide(trigger, state, gates(), tipContext(page, anchorInfo));
      store.setLastDecision(`${trigger.kind}${"anchor" in trigger ? `:${trigger.anchor.id}` : ""} → ${"show" in d ? `show ${d.show.id}` : `blocked (${d.blocked})`}`);
      if (!("show" in d)) {
        if (trigger.kind === "route" && TRANSIENT.has(d.blocked) && attempt < 8) window.setTimeout(() => fire(trigger, attempt + 1), 1000);
        return d;
      }
      store.update((s) => afterShow(s, d, trigger, Date.now()));
      void speak(d);
      return d;
    };

    const speak = async (d: Extract<GuideDecision, { show: unknown }>) => {
      const el = d.anchorId ? (getAnchors().find((a) => a.id === d.anchorId)?.el ?? null) : null;
      if (el) {
        // Fly first, then talk (the tip lands with Pip).
        await usePipPosition.getState().flyToAnchor(el);
        if (d.spotlight) useSpotlight.getState().show(el, { ms: 4500 });
      } else {
        pip.react("hop");
      }
      const tipId = d.show.id;
      useBubble.getState().show({
        kind: "tip",
        id: tipId,
        source: "guide",
        proactive: true,
        text: d.show.text,
        productIds: d.show.productIds,
        chips: d.show.chips?.map((c, i) => ({
          label: c.label,
          message: c.message,
          primary: i === 0 && !!c.message,
          run: c.action === "feedback" ? askFeedback : c.message ? undefined : () => useBubble.getState().close("user"),
        })),
        onClose: (reason) => {
          const r = afterClose(useGuide.getState().state, reason === "replaced" ? "engaged" : reason, Date.now());
          useGuide.getState().update(() => r.state);
          if (r.goQuiet) {
            useSignals.getState().setQuiet(true);
            useBubble.getState().show({ kind: "tip", id: "quiet-notice", source: "system", text: "Got it, I'll stay quiet. Tap me whenever you need me." });
          }
        },
      });
    };

    // ── Activity, idle and dwell ──
    const activity = () => {
      act.last = performance.now();
      act.interacted = true;
      act.idleStage = 0;
    };
    const onMove = (e: PointerEvent) => {
      activity();
      if (e.pointerType !== "mouse") return;
      const a = anchorAt(e.clientX, e.clientY, 0);
      const id = a && !SKIP_TOPICS.has(a.topic) ? a.id : null;
      if (id !== dwell.id) {
        dwell.id = id;
        dwell.since = performance.now();
        dwell.fired = false;
      }
    };
    const onScroll = () => {
      activity();
      act.lastScroll = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", activity, { passive: true });
    window.addEventListener("touchstart", activity, { passive: true });

    const unsubAnchors = subscribeAnchors(() => {
      for (const a of getAnchors()) {
        if (a.visible >= 0.75 && !arrived.has(a.id) && (GUIDE_CONFIG.scrollTopics as readonly string[]).includes(a.topic)) {
          arrived.add(a.id);
          if (act.interacted) pendingScroll.push(a);
        }
      }
    });

    const tick = window.setInterval(() => {
      const now = performance.now();
      // Hover dwell (desktop only).
      if (!isMobile() && dwell.id && !dwell.fired && now - dwell.since >= GUIDE_CONFIG.dwellMs) {
        dwell.fired = true;
        const a = getAnchors().find((x) => x.id === dwell.id);
        if (a) fire({ kind: "dwell", anchor: { id: a.id, topic: a.topic, productId: a.productId } });
      }
      // Idle, per stillness: first a tip about what the user is looking at, then (if they
      // stay still) a check-in: "is something in your way?". With nothing to say about the
      // element, or before they've touched the page, the check-in comes first. If a gate is
      // only closed for now (cooldown, a bubble still up), keep trying while they stay still.
      const idleMs = isMobile() ? GUIDE_CONFIG.idleMsMobile : GUIDE_CONFIG.idleMs;
      if (act.idleStage < 2 && now - act.last >= idleMs && now - act.idleTry >= 1000) {
        act.idleTry = now;
        const p = pipRuntime.pointer;
        const a = act.interacted && act.idleStage === 0
          ? ((!isMobile() && performance.now() - p.t < 60_000 ? anchorAt(p.x, p.y, 120) : null) ?? mostVisibleAnchor((x) => !SKIP_TOPICS.has(x.topic)))
          : null;
        let d: GuideDecision | null = a && !SKIP_TOPICS.has(a.topic) ? fire({ kind: "idle", anchor: { id: a.id, topic: a.topic, productId: a.productId } }) : null;
        if (!d || (!("show" in d) && (d.blocked === "exhausted" || d.blocked === "nothing"))) d = fire({ kind: "checkin", page: pageType(window.location.pathname) });
        const anchorTip = "show" in d && d.anchorId !== null;
        if (anchorTip) act.idleStage = 1;
        else if ("show" in d || !RETRY_IDLE.has(d.blocked)) act.idleStage = 2;
      }
      // Scroll arrival, once scrolling settles.
      if (pendingScroll.length && now - act.lastScroll > 600) {
        const a = pendingScroll.shift()!;
        if (a.el.isConnected && a.visible >= 0.5) fire({ kind: "scroll", anchor: { id: a.id, topic: a.topic, productId: a.productId } });
      }
    }, 200);

    // ── Behaviour signals (revisits, back-and-forth, filter thrash, cart removal) ──
    const unsubSignals = useSignals.subscribe((s, prev) => {
      if (s.events === prev.events) return;
      const c = candidates({ events: s.events, now: Date.now(), category: useCatalogUI.getState().filters.category })[0];
      if (c) fire({ kind: "behaviour", nudge: c });
    });

    // ── Cart drawer counts as the "cart" page ──
    const unsubCart = useCart.subscribe((s, prev) => {
      if (s.drawerOpen && !prev.drawerOpen) window.setTimeout(() => fire({ kind: "route", page: "cart" }), 900);
    });
    const unsubCategory = useCatalogUI.subscribe((s, prev) => {
      if (s.filters.category && s.filters.category !== prev.filters.category) window.setTimeout(() => fire({ kind: "route", page: "category" }), 1200);
    });

    (window as unknown as { __guide?: { fire: typeof fire } }).__guide = { fire };

    return () => {
      window.clearInterval(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", activity);
      window.removeEventListener("touchstart", activity);
      unsubAnchors();
      unsubSignals();
      unsubCart();
      unsubCategory();
    };
  }, []);

  // ── Page arrival: the tour offer on a first-ever visit, else a page intro ──
  useEffect(() => {
    const id = window.setTimeout(() => {
      const page = pageType(pathname);
      if (page === "home" && !tourDone()) return offerTour();
      const w = window as unknown as { __guide?: { fire: (t: Trigger) => void } };
      w.__guide?.fire({ kind: "route", page });
    }, 1800);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
