/**
 * Pip's state table: the single place that defines how each agent state looks and moves.
 *
 * Every numeric field is tweened (never swapped) when the state changes, including the
 * "motion" weights such as `blink` or `follow`, so behaviours fade in and out smoothly.
 */

export const PIP_STATES = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "searching",
  "presenting",
  "comparing",
  "speaking",
  "acting",
  "success",
  "error",
  "sleeping",
] as const;
export type PipState = (typeof PIP_STATES)[number];

/** Eye shapes, blended by weight in the shader. Order matters: it maps to two vec3 uniforms. */
export const EYE_SHAPES = ["capsule", "narrow", "happy", "wide", "cross", "closed"] as const;
export type EyeShape = (typeof EYE_SHAPES)[number];

import { tokenDefinitions } from "@/tokens/definitions";

export const PIP_COLORS = {
  accent: tokenDefinitions.colors.dark.accent,
  listening: tokenDefinitions.colors.dark.listening,
  thinking: tokenDefinitions.colors.dark.thinking,
  searching: tokenDefinitions.colors.dark.searching,
  success: tokenDefinitions.colors.dark.success,
  error: tokenDefinitions.colors.dark.danger,
} as const;

/** Flat, tweenable parameter set. These map 1:1 onto uniforms or per-frame motion. */
export interface PipParams {
  // ── Spec uniforms ──
  noiseAmplitude: number;
  noiseFrequency: number;
  noiseSpeed: number;
  squashY: number;
  rimR: number;
  rimG: number;
  rimB: number;
  coreIntensity: number;
  eyeCapsule: number;
  eyeNarrow: number;
  eyeHappy: number;
  eyeWide: number;
  eyeCross: number;
  eyeClosed: number;
  eyeOpenness: number;
  gazeX: number;
  gazeY: number;
  haloOpacity: number;
  haloSpeed: number;
  scale: number;
  // ── Extra look ──
  rimIntensity: number;
  saturation: number;
  haloRadius: number;
  /** Face roll for the curious head-tilt (radians). */
  faceTilt: number;
  /** Comparing: opposing noise bands on the left/right halves. */
  split: number;
  // ── Pose ──
  leanX: number;
  leanY: number;
  leanZ: number;
  offsetX: number;
  offsetY: number;
  // ── Procedural motion weights ──
  breathAmp: number;
  breathRate: number;
  swayAmp: number;
  swayRate: number;
  dartAmp: number;
  alternateAmp: number;
  pulseAmp: number;
  pulseRate: number;
  blink: number;
  follow: number;
  drift: number;
  micReactive: number;
  talk: number;
}

export type Entrance = "hop" | "hop-spin" | "shake" | null;

export interface StateDef {
  /** Default one-line caption; agent events may override it (e.g. "Searching 248 products…"). */
  caption: string;
  color: string;
  params: Partial<Omit<PipParams, "rimR" | "rimG" | "rimB">> & { eyes?: Partial<Record<EyeShape, number>> };
  entrance: Entrance;
  /**
   * Transition duration in seconds (after the 120 ms glitch). Params always ease with
   * expo.out (no body overshoot); only the greeting/success hop entrances use back.out.
   */
  duration: number;
  /** Transient states return to `settleTo` after this many ms. */
  settle?: { afterMs: number; to: PipState };
}

export const BASE_PARAMS: PipParams = {
  noiseAmplitude: 0.035,
  noiseFrequency: 1.4,
  noiseSpeed: 0.25,
  squashY: 1,
  rimR: 0,
  rimG: 0,
  rimB: 0,
  coreIntensity: 0.4,
  eyeCapsule: 1,
  eyeNarrow: 0,
  eyeHappy: 0,
  eyeWide: 0,
  eyeCross: 0,
  eyeClosed: 0,
  eyeOpenness: 1,
  gazeX: 0,
  gazeY: 0,
  haloOpacity: 0,
  haloSpeed: 0.4,
  scale: 1,
  rimIntensity: 0.75,
  saturation: 1,
  haloRadius: 1.5,
  faceTilt: 0,
  split: 0,
  leanX: 0,
  leanY: 0,
  leanZ: 0,
  offsetX: 0,
  offsetY: 0,
  breathAmp: 0.012,
  breathRate: 1.1,
  swayAmp: 0,
  swayRate: 1,
  dartAmp: 0,
  alternateAmp: 0,
  pulseAmp: 0,
  pulseRate: 2,
  blink: 1,
  follow: 1,
  drift: 1,
  micReactive: 0,
  talk: 0,
};

export const STATES: Record<PipState, StateDef> = {
  idle: {
    caption: "",
    color: PIP_COLORS.accent,
    params: {},
    entrance: null,
    duration: 0.6,
  },
  greeting: {
    caption: "Hey! Looking for something?",
    color: PIP_COLORS.accent,
    params: {
      eyes: { happy: 1 },
      coreIntensity: 0.85,
      rimIntensity: 1,
      noiseAmplitude: 0.06,
      noiseSpeed: 0.6,
      blink: 0,
    },
    entrance: "hop",
    duration: 0.5,
    settle: { afterMs: 2400, to: "idle" },
  },
  listening: {
    caption: "Listening…",
    color: PIP_COLORS.listening,
    params: {
      eyes: { wide: 0.65, capsule: 0.35 },
      eyeOpenness: 1.08,
      coreIntensity: 0.7,
      rimIntensity: 1,
      breathAmp: 0.028,
      breathRate: 1.7,
      faceTilt: 0.2,
      leanZ: 0.1,
      gazeY: 0.08,
      micReactive: 1,
      drift: 0.25,
    },
    entrance: null,
    duration: 0.45,
  },
  thinking: {
    caption: "Thinking…",
    color: PIP_COLORS.thinking,
    params: {
      eyeOpenness: 0.5,
      gazeX: -0.6,
      gazeY: 0.65,
      leanX: -0.2,
      noiseAmplitude: 0.05,
      noiseFrequency: 1.1,
      noiseSpeed: 0.55,
      coreIntensity: 0.7,
      rimIntensity: 1,
      pulseAmp: 0.5,
      pulseRate: 3.2,
      haloOpacity: 0.45,
      haloSpeed: 0.7,
      blink: 0.25,
      follow: 0,
      drift: 0.15,
    },
    entrance: null,
    duration: 0.55,
  },
  searching: {
    caption: "Searching products…",
    color: PIP_COLORS.searching,
    params: {
      eyes: { capsule: 0.75, narrow: 0.25 },
      noiseAmplitude: 0.065,
      noiseFrequency: 1.8,
      noiseSpeed: 1.3,
      coreIntensity: 0.75,
      rimIntensity: 1.1,
      swayAmp: 0.14,
      swayRate: 2.4,
      dartAmp: 0.75,
      haloOpacity: 0.9,
      haloSpeed: 4,
      blink: 0,
      follow: 0,
      drift: 0,
    },
    entrance: null,
    duration: 0.4,
  },
  presenting: {
    caption: "Here's what I found",
    color: PIP_COLORS.accent,
    params: {
      leanY: -0.32,
      leanZ: 0.07,
      offsetX: -0.14,
      gazeX: -0.5,
      gazeY: -0.12,
      coreIntensity: 0.7,
      rimIntensity: 1,
      follow: 0,
      drift: 0.2,
    },
    entrance: null,
    duration: 0.55,
  },
  comparing: {
    caption: "Comparing…",
    color: PIP_COLORS.searching,
    params: {
      split: 1,
      alternateAmp: 0.75,
      noiseAmplitude: 0.045,
      noiseSpeed: 0.7,
      coreIntensity: 0.7,
      rimIntensity: 1,
      haloOpacity: 0.3,
      haloSpeed: 1.2,
      blink: 0.4,
      follow: 0,
      drift: 0,
    },
    entrance: null,
    duration: 0.5,
  },
  speaking: {
    caption: "",
    color: PIP_COLORS.accent,
    params: {
      talk: 1,
      coreIntensity: 0.6,
      rimIntensity: 0.95,
      drift: 0.5,
    },
    entrance: null,
    duration: 0.4,
  },
  acting: {
    caption: "Adding to cart…",
    color: PIP_COLORS.thinking,
    params: {
      eyes: { narrow: 1 },
      noiseAmplitude: 0.022,
      noiseSpeed: 0.9,
      scale: 0.95,
      coreIntensity: 0.8,
      rimIntensity: 1.1,
      haloOpacity: 0.85,
      haloRadius: 1.28,
      haloSpeed: 2.6,
      blink: 0,
      follow: 0,
      drift: 0,
    },
    entrance: null,
    duration: 0.4,
  },
  success: {
    caption: "Added & verified ✓",
    color: PIP_COLORS.success,
    params: {
      eyes: { happy: 1 },
      coreIntensity: 1.2,
      rimIntensity: 1.3,
      noiseAmplitude: 0.05,
      noiseSpeed: 0.8,
      haloOpacity: 0.5,
      haloRadius: 1.65,
      haloSpeed: 1.5,
      blink: 0,
    },
    entrance: "hop-spin",
    duration: 0.5,
    settle: { afterMs: 2600, to: "idle" },
  },
  error: {
    caption: "Couldn't do that.",
    color: PIP_COLORS.error,
    params: {
      eyes: { cross: 1 },
      saturation: 0.55,
      coreIntensity: 0.55,
      rimIntensity: 1.1,
      noiseAmplitude: 0.02,
      blink: 0,
      follow: 0,
      drift: 0,
    },
    entrance: "shake",
    duration: 0.35,
    settle: { afterMs: 3200, to: "idle" },
  },
  sleeping: {
    caption: "Paused",
    color: PIP_COLORS.accent,
    params: {
      eyes: { closed: 1 },
      coreIntensity: 0.06,
      rimIntensity: 0.18,
      saturation: 0.35,
      squashY: 0.92,
      offsetY: -0.1,
      leanX: 0.14,
      noiseSpeed: 0.08,
      noiseAmplitude: 0.025,
      breathAmp: 0.022,
      breathRate: 0.45,
      blink: 0,
      follow: 0,
      drift: 0,
    },
    entrance: null,
    duration: 0.6,
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const EYE_KEY: Record<EyeShape, keyof PipParams> = {
  capsule: "eyeCapsule",
  narrow: "eyeNarrow",
  happy: "eyeHappy",
  wide: "eyeWide",
  cross: "eyeCross",
  closed: "eyeClosed",
};

/** Resolves a state into a complete parameter set (base + overrides, normalised eye weights, rim colour in sRGB 0–1). */
export function resolveParams(state: PipState): PipParams {
  const def = STATES[state];
  const { eyes, ...rest } = def.params;
  const out: PipParams = { ...BASE_PARAMS, ...rest };
  if (eyes) {
    const total = Object.values(eyes).reduce((a, b) => a + (b ?? 0), 0) || 1;
    for (const shape of EYE_SHAPES) out[EYE_KEY[shape]] = (eyes[shape] ?? 0) / total;
  }
  [out.rimR, out.rimG, out.rimB] = hexToRgb(def.color);
  return out;
}
