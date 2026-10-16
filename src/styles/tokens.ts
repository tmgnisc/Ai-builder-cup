/** AUTO-GENERATED from src/tokens/definitions.ts — DO NOT EDIT DIRECTLY */

export { tokenDefinitions } from "../tokens/definitions";

export const tokens = {
  colors: {
    dark: {
      bg: 0x0a0b0f,
      surface: 0x12141b,
      surface2: 0x1a1d26,
      accent: 0xc6ff3d,
      accentFg: 0x0a0b0f,
      listening: 0x3dffb0,
      thinking: 0xffb23d,
      searching: 0x3dd9ff,
      success: 0xc6ff3d,
      danger: 0xff5a5a,
    },
    light: {
      bg: 0xf4f5f7,
      surface: 0xffffff,
      surface2: 0xeceef3,
      accent: 0xc6ff3d,
      accentText: 0x4a7300,
      accentFg: 0x0a0b0f,
      listening: 0x00a86b,
      thinking: 0xc77700,
      searching: 0x0091b8,
      success: 0x4a7300,
      danger: 0xd93636,
    },
  },
  zIndex: {
    base: 0,
    dock: 10,
    elevated: 20,
    sticky: 30,
    drawer: 40,
    modal: 50,
    orb: 55,
    popover: 60,
    bubble: 65,
    dialog: 70,
    tooltip: 75,
    toast: 80,
    spotlight: 85,
    grain: 100,
  },
  durations: {
    instant: 0,
    fast: 0.15,
    base: 0.25,
    slow: 0.4,
    deliberate: 0.55,
  },
  easings: {
    out: "expo.out",
    inOut: "expo.inOut",
    standard: "power2.out",
    pop: "back.out(1.7)",
  },
  layout: {
    container: 1400,
  },
} as const;

export type DesignTokens = typeof tokens;
