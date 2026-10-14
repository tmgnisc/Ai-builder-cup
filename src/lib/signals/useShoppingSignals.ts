"use client";

import { useEffect } from "react";
import { useCart } from "@/store/useCart";
import { useCatalogUI } from "@/store/useCatalogUI";
import { useChat } from "@/store/useChat";
import { useCompare } from "@/store/useCompare";
import { useSignals } from "@/store/useSignals";
import { evaluate } from "./nudgeEngine";

/**
 * Records shopping signals from the existing stores (filters, cart, compare; product views
 * come from <ProductViewTracker/>) and runs the nudge engine after each new signal.
 * Evaluation is event-driven: there is no idle timer, so inactivity can't trigger a nudge.
 */
export function useShoppingSignals() {
  useEffect(() => {
    const { record } = useSignals.getState();
    let retry: number | undefined;

    const runEngine = () => {
      window.clearTimeout(retry);
      const s = useSignals.getState();
      const chat = useChat.getState();
      const decision = evaluate({
        events: s.events,
        now: Date.now(),
        firedKeys: s.firedKeys,
        dismissedTypes: s.dismissedTypes,
        lastNudgeAt: s.lastNudgeAt,
        lastTypingAt: s.lastTypingAt,
        paused: s.paused,
        busy: chat.open || chat.busy || s.active !== null,
        category: useCatalogUI.getState().filters.category,
      });
      if (!decision) return;
      if ("show" in decision) s.show(decision.show);
      // Typing only postpones a nudge that a real signal already earned.
      else if (decision.blocked === "typing" && decision.retryAt) retry = window.setTimeout(runEngine, decision.retryAt - Date.now() + 50);
    };

    const unsubs = [
      useSignals.subscribe((s, prev) => {
        if (s.events !== prev.events) runEngine();
      }),
      useCatalogUI.subscribe((s, prev) => {
        if (s.lastChange && s.lastChange !== prev.lastChange) record({ type: "filter", key: s.lastChange.key, at: s.lastChange.at });
      }),
      useCart.subscribe((s, prev) => {
        if (!prev.cart || !s.cart || s.cart === prev.cart) return;
        const before = new Map(prev.cart.lines.map((l) => [l.productId, l.qty]));
        const after = new Map(s.cart.lines.map((l) => [l.productId, l.qty]));
        const at = Date.now();
        for (const [id, q] of after) if (q > (before.get(id) ?? 0)) record({ type: "cart_add", productId: id, at });
        for (const [id] of before) if (!after.has(id)) record({ type: "cart_remove", productId: id, at });
      }),
      useCompare.subscribe((s, prev) => {
        if (s.ids === prev.ids) return;
        const at = Date.now();
        for (const id of s.ids) if (!prev.ids.includes(id)) record({ type: "compare_toggle", productId: id, added: true, at });
        for (const id of prev.ids) if (!s.ids.includes(id)) record({ type: "compare_toggle", productId: id, added: false, at });
      }),
    ];

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) useSignals.getState().markTyping();
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      unsubs.forEach((u) => u());
      document.removeEventListener("keydown", onKey, true);
      window.clearTimeout(retry);
    };
  }, []);
}
