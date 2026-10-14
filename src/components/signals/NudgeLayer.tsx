"use client";

import { useEffect } from "react";
import { pip } from "@/components/companion/runtime";
import { useShoppingSignals } from "@/lib/signals/useShoppingSignals";
import { useBubble } from "@/store/useBubble";
import { useSignals } from "@/store/useSignals";

/** Runs the signals hook and voices active nudges through Pip's speech bubble. */
export function NudgeLayer() {
  useShoppingSignals();
  const active = useSignals((s) => s.active);

  useEffect(() => {
    if (!active) return;
    pip.react("hop");
    const id = `nudge:${active.key}`;
    useBubble.getState().show({
      kind: "tip",
      id,
      source: "guide",
      proactive: true,
      text: active.text,
      productIds: active.productIds.length === 1 ? active.productIds : undefined,
      chips: [
        ...active.actions.map((a, i) => ({ label: a.label, message: a.message, primary: i === 0 })),
        { label: "Not now", run: () => useBubble.getState().close("user") },
      ],
    });
    // When this tip leaves the bubble, settle the nudge (✕ / "Not now" suppress the type).
    return useBubble.subscribe((s, prev) => {
      const wasOurs = prev.content?.kind === "tip" && prev.content.id === id;
      const stillOurs = s.content?.kind === "tip" && s.content.id === id;
      if (wasOurs && !stillOurs) useSignals.getState().dismiss(s.lastClose?.reason === "user");
    });
  }, [active]);

  return null;
}
