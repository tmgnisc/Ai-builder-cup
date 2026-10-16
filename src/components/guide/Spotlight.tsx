"use client";

import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { pip } from "@/components/companion/runtime";
import { gsap, motion } from "@/lib/motion";

/**
 * Spotlight: a soft lime ring around a target (and, for the tour and agent highlights,
 * a slight dim of everything else via an SVG cutout). Never blocks clicks.
 */

interface SpotlightState {
  target: Element | null;
  dim: boolean;
  key: number;
  show: (target: Element, opts?: { dim?: boolean; ms?: number }) => void;
  hide: () => void;
}

let hideTimer: number | undefined;

export const useSpotlight = create<SpotlightState>()((set, get) => ({
  target: null,
  dim: false,
  key: 0,
  show: (target, opts = {}) => {
    window.clearTimeout(hideTimer);
    set({ target, dim: !!opts.dim, key: get().key + 1 });
    const ms = opts.ms ?? 3500;
    pip.glanceAtElement(target, ms);
    if (ms > 0) hideTimer = window.setTimeout(() => get().hide(), ms);
  },
  hide: () => {
    window.clearTimeout(hideTimer);
    set({ target: null });
  },
}));

const PAD = 8;

export function Spotlight() {
  const target = useSpotlight((s) => s.target);
  const dim = useSpotlight((s) => s.dim);
  const key = useSpotlight((s) => s.key);
  const [shown, setShown] = useState<{ target: Element; dim: boolean } | null>(null);
  const rootRef = useRef<SVGSVGElement>(null);
  const holeRef = useRef<SVGRectElement>(null);
  const ringRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    if (target) setShown({ target, dim });
  }, [target, dim, key]);

  // Track the target every frame (it scrolls / animates).
  useEffect(() => {
    if (!shown) return;
    const tick = () => {
      const r = shown.target.getBoundingClientRect();
      const radius = Math.min(18, Math.min(r.width, r.height) / 2);
      for (const el of [holeRef.current, ringRef.current]) {
        if (!el) continue;
        el.setAttribute("x", String(r.left - PAD));
        el.setAttribute("y", String(r.top - PAD));
        el.setAttribute("width", String(Math.max(0, r.width + PAD * 2)));
        el.setAttribute("height", String(Math.max(0, r.height + PAD * 2)));
        el.setAttribute("rx", String(radius + PAD / 2));
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [shown]);

  // In / out.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !shown) return;
    if (target) {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: motion.dur(0.45), ease: "power2.out" });
      if (ringRef.current && !motion.reduced) {
        gsap.fromTo(ringRef.current, { attr: { "stroke-width": 10 }, opacity: 0 }, { attr: { "stroke-width": 2 }, opacity: 1, duration: 0.6, ease: "expo.out" });
      }
    } else {
      gsap.to(root, { opacity: 0, duration: motion.dur(0.35), ease: "power2.in", onComplete: () => setShown(null) });
    }
  }, [target, shown, key]);

  if (!shown) return null;

  return (
    <svg ref={rootRef} aria-hidden className="pointer-events-none fixed inset-0 z-[54] h-full w-full" style={{ opacity: 0 }}>
      <defs>
        <mask id="pip-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect ref={holeRef} fill="black" />
        </mask>
      </defs>
      {shown.dim && <rect width="100%" height="100%" fill="var(--overlay)" mask="url(#pip-spotlight-mask)" />}
      <rect
        ref={ringRef}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 10px var(--accent))" }}
      />
    </svg>
  );
}
