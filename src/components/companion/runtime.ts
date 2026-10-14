"use client";

import type { PipParams } from "./states";

/**
 * Shared, non-reactive runtime for Pip. Written by DOM-side code (layout, pointer, audio)
 * and read every frame by the WebGL scene, so nothing here triggers React renders.
 */

export type Reaction = "hop" | "hop-spin" | "shake";

interface Runtime {
  /** Pip's on-screen centre and displayed size in CSS px (updated by the layer's layout pass). */
  center: { x: number; y: number };
  displaySize: number;
  /** displayed size / canvas CSS size; the scene lowers DPR when Pip is shrunk. */
  renderScale: number;
  pointer: { x: number; y: number; t: number };
  glance: { x: number; y: number; until: number } | null;
  /** 0–1 microphone level (Web Audio analyser, Phase 5). */
  micLevel: number;
  /** 0–1 speech envelope from TTS; `speechAt` marks freshness so we can fall back to a simulated envelope. */
  speechLevel: number;
  speechAt: number;
  /** Dev playground: values here replace tweened params each frame. */
  override: Partial<PipParams> | null;
  /** Element that receives the CSS RGB-split during the transition glitch. */
  glitchEl: HTMLElement | null;
  /** Lets reduced-motion/demand mode request a frame. */
  invalidate: (() => void) | null;
}

export const pipRuntime: Runtime = {
  center: { x: 0, y: 0 },
  displaySize: 0,
  renderScale: 1,
  pointer: { x: 0, y: 0, t: -Infinity },
  glance: null,
  micLevel: 0,
  speechLevel: 0,
  speechAt: -Infinity,
  override: null,
  glitchEl: null,
  invalidate: null,
};

type Listener = (r: Reaction) => void;
const listeners = new Set<Listener>();

export function onPipReaction(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Imperative reactions. None of these change Pip's agent state. */
export const pip = {
  react(r: Reaction) {
    listeners.forEach((fn) => fn(r));
  },
  /** Look at a screen point (CSS px) for `ms`, e.g. a hovered product card. */
  glanceAt(x: number, y: number, ms = 900) {
    pipRuntime.glance = { x, y, until: performance.now() + ms };
    pipRuntime.invalidate?.();
  },
  /** Glance at the centre of an element. */
  glanceAtElement(el: Element, ms = 900) {
    const r = el.getBoundingClientRect();
    pip.glanceAt(r.left + r.width / 2, r.top + r.height / 2, ms);
  },
  setMicLevel(level: number) {
    pipRuntime.micLevel = Math.min(1, Math.max(0, level));
  },
  setSpeechLevel(level: number) {
    pipRuntime.speechLevel = Math.min(1, Math.max(0, level));
    pipRuntime.speechAt = performance.now();
  },
};
