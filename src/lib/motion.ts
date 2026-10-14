"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useSyncExternalStore } from "react";

/**
 * Motion utilities. Every GSAP consumer imports `gsap` from here so plugins are registered
 * exactly once, and checks reduced motion through `motion.*` / `useReducedMotion()`.
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, SplitText, ScrambleTextPlugin);
  gsap.defaults({ ease: "expo.out", duration: 0.5 });
}

export { gsap, useGSAP, Flip, ScrollTrigger, SplitText };

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

export const motion = {
  /** Duration in seconds, collapsed to 0 under reduced motion. */
  dur(seconds: number): number {
    return prefersReducedMotion() ? 0 : seconds;
  },
  /** Stagger amount, collapsed to 0 under reduced motion. */
  stagger(seconds: number): number {
    return prefersReducedMotion() ? 0 : seconds;
  },
  get reduced(): boolean {
    return prefersReducedMotion();
  },
  ease: {
    out: "expo.out",
    pop: "back.out(1.7)",
    inOut: "expo.inOut",
  },
} as const;
