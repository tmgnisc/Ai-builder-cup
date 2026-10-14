"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MiniPip } from "@/components/chat/MiniPip";
import { pip } from "@/components/companion/runtime";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { useShoppingSignals } from "@/lib/signals/useShoppingSignals";
import type { Nudge } from "@/lib/signals/nudgeEngine";
import { useChat } from "@/store/useChat";
import { useSignals } from "@/store/useSignals";

const AUTO_HIDE_MS = 14_000;

/**
 * Mounts the signals hook and renders the active nudge as a speech bubble rising from the
 * docked Pip, with a soft greeting-style hop (a reaction, so Pip's agent state is untouched).
 */
export function NudgeLayer() {
  useShoppingSignals();
  const active = useSignals((s) => s.active);
  const dismiss = useSignals((s) => s.dismiss);
  const send = useChat((s) => s.send);
  const ref = useRef<HTMLDivElement>(null);
  // Keep the last nudge rendered while the exit animation plays.
  const [shown, setShown] = useState<Nudge | null>(null);

  useEffect(() => {
    if (active) setShown(active);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    pip.react("hop");
    const id = window.setTimeout(() => useSignals.getState().dismiss(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [active]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !shown) return;
      if (active) {
        if (motion.reduced) return gsap.set(el, { autoAlpha: 1, y: 0, scale: 1 });
        gsap.fromTo(el, { autoAlpha: 0, y: 16, scale: 0.9, transformOrigin: "100% 100%" }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)", delay: 0.15 });
      } else {
        gsap.to(el, { autoAlpha: 0, y: 8, scale: 0.95, duration: motion.dur(0.25), ease: "power2.in", onComplete: () => setShown(null) });
      }
    },
    { dependencies: [active, shown] },
  );

  if (!shown) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Suggestion from Pip"
      aria-live="polite"
      className="glass invisible fixed bottom-[140px] right-3 z-40 w-[min(300px,calc(100vw-24px))] rounded-[22px] rounded-br-md p-3.5 md:bottom-[212px] md:right-6"
    >
      <div className="flex items-start gap-2.5">
        <MiniPip live size={24} className="mt-0.5" />
        <p className="flex-1 text-[13.5px] leading-snug">{shown.text}</p>
        <button
          type="button"
          onClick={() => dismiss(true)}
          aria-label="Dismiss and don't suggest this again"
          title="Don't suggest this again"
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 pl-[34px]">
        {shown.actions.map((a, i) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              dismiss(false);
              void send(a.message);
            }}
            className={
              i === 0
                ? "rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg hover:brightness-110"
                : "rounded-full bg-surface px-3 py-1.5 text-xs hairline hover:bg-surface-2"
            }
          >
            {a.label}
          </button>
        ))}
        <button type="button" onClick={() => dismiss(false)} className="rounded-full px-2 py-1.5 text-xs text-muted hover:text-text">
          Not now
        </button>
      </div>
    </div>
  );
}
