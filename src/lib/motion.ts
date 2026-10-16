"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion, useReducedMotion } from "@/hooks/useReducedMotion";
import { tokens } from "@/styles/tokens";

/**
 * Motion utilities. Every GSAP consumer imports `gsap` from here so plugins are registered
 * exactly once, and checks reduced motion through `motion.*` / `useReducedMotion()`.
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, SplitText, MotionPathPlugin);
  gsap.defaults({ ease: tokens.easings.out, duration: tokens.durations.deliberate });
}

export { gsap, useGSAP, Flip, ScrollTrigger, SplitText, useReducedMotion, prefersReducedMotion };

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
    out: tokens.easings.out,
    pop: tokens.easings.pop,
    inOut: tokens.easings.inOut,
  },
} as const;
