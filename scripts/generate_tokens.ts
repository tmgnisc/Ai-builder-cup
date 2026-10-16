import fs from "node:fs";
import path from "node:path";
import { tokenDefinitions } from "../src/tokens/definitions";

const rootDir = process.cwd();
const stylesDir = path.resolve(rootDir, "src/styles");

function generateCSS(): string {
  const { colors, typography, radii, zIndex, motion } = tokenDefinitions;

  return `/* AUTO-GENERATED from src/tokens/definitions.ts — DO NOT EDIT DIRECTLY */

:root {
  color-scheme: dark;

  --bg: ${colors.dark.bg};
  --surface: ${colors.dark.surface};
  --surface-2: ${colors.dark.surface2};
  --border: ${colors.dark.border};
  --border-strong: ${colors.dark.borderStrong};
  --text: ${colors.dark.text};
  --muted: ${colors.dark.muted};

  --accent: ${colors.dark.accent};
  --accent-text: ${colors.dark.accentText};
  --accent-fg: ${colors.dark.accentFg};

  --state-listening: ${colors.dark.listening};
  --state-thinking: ${colors.dark.thinking};
  --state-searching: ${colors.dark.searching};
  --state-success: ${colors.dark.success};
  --state-error: ${colors.dark.danger};

  --glass: ${colors.dark.glass};
  --glass-border: ${colors.dark.glassBorder};
  --overlay: ${colors.dark.overlay};
  --grain-opacity: ${colors.dark.grainOpacity};
  --spotlight: ${colors.dark.spotlight};

  /* Z-Index Scale */
  --z-base: ${zIndex.base};
  --z-dock: ${zIndex.dock};
  --z-elevated: ${zIndex.elevated};
  --z-sticky: ${zIndex.sticky};
  --z-drawer: ${zIndex.drawer};
  --z-modal: ${zIndex.modal};
  --z-orb: ${zIndex.orb};
  --z-popover: ${zIndex.popover};
  --z-bubble: ${zIndex.bubble};
  --z-dialog: ${zIndex.dialog};
  --z-tooltip: ${zIndex.tooltip};
  --z-toast: ${zIndex.toast};
  --z-spotlight: ${zIndex.spotlight};
  --z-grain: ${zIndex.grain};

  /* Motion */
  --duration-instant: ${motion.durations.instant}s;
  --duration-fast: ${motion.durations.fast}s;
  --duration-base: ${motion.durations.base}s;
  --duration-slow: ${motion.durations.slow}s;
  --duration-deliberate: ${motion.durations.deliberate}s;

  --ease-out-expo: ${motion.easings.outExpo};
  --ease-in-out-expo: ${motion.easings.inOutExpo};
  --ease-standard: ${motion.easings.standard};
  --ease-pop: ${motion.easings.pop};
}

:root[data-theme="light"] {
  color-scheme: light;

  --bg: ${colors.light.bg};
  --surface: ${colors.light.surface};
  --surface-2: ${colors.light.surface2};
  --border: ${colors.light.border};
  --border-strong: ${colors.light.borderStrong};
  --text: ${colors.light.text};
  --muted: ${colors.light.muted};

  --accent: ${colors.light.accent};
  --accent-text: ${colors.light.accentText};
  --accent-fg: ${colors.light.accentFg};

  --state-listening: ${colors.light.listening};
  --state-thinking: ${colors.light.thinking};
  --state-searching: ${colors.light.searching};
  --state-success: ${colors.light.success};
  --state-error: ${colors.light.danger};

  --glass: ${colors.light.glass};
  --glass-border: ${colors.light.glassBorder};
  --overlay: ${colors.light.overlay};
  --grain-opacity: ${colors.light.grainOpacity};
  --spotlight: ${colors.light.spotlight};
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-text: var(--accent-text);
  --color-accent-fg: var(--accent-fg);
  --color-listening: var(--state-listening);
  --color-thinking: var(--state-thinking);
  --color-searching: var(--state-searching);
  --color-success: var(--state-success);
  --color-danger: var(--state-error);
  --color-glass: var(--glass);
  --color-glass-border: var(--glass-border);
  --color-overlay: var(--overlay);

  --font-display: ${typography.fontFamilies.display};
  --font-sans: ${typography.fontFamilies.sans};
  --font-mono: ${typography.fontFamilies.mono};

  --radius-xs: ${radii.xs};
  --radius-sm: ${radii.sm};
  --radius-md: ${radii.md};
  --radius-lg: ${radii.lg};
  --radius-card: ${radii.card};
  --radius-panel: ${radii.panel};
  --radius-full: ${radii.full};

  --ease-out-expo: var(--ease-out-expo);
  --ease-in-out-expo: var(--ease-in-out-expo);
  --ease-standard: var(--ease-standard);
  --ease-pop: var(--ease-pop);

  --text-2xs: 10px;
  --text-2xs--line-height: 14px;
}

@utility max-w-page {
  max-width: ${tokenDefinitions.layout.container};
}

@utility hero-headline {
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
}

@utility grid-cols-hero {
  grid-template-columns: 1fr 280px;
}

@utility product-detail-grid {
  grid-template-columns: 1fr 380px;
}

@utility product-detail-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

@utility store-grid {
  grid-template-columns: 240px minmax(0, 1fr);
}

@utility grid-cols-checkout {
  grid-template-columns: 1fr 300px;
}

@utility bubble-width {
  width: min(340px, calc(100vw - 24px));
}

@utility bubble-max-h {
  max-height: 62dvh;
}

@utility drawer-width {
  width: min(420px, calc(100vw - 24px));
}

@utility drawer-bottom-h {
  max-height: min(80dvh, 720px);
}

@utility drawer-closed-right {
  transform: translateX(calc(100% + 24px));
}

@utility drawer-closed-left {
  transform: translateX(calc(-100% - 24px));
}

@utility drawer-closed-bottom {
  transform: translateY(calc(100% + 24px));
}

@utility compare-tray-w-mobile {
  max-width: calc(100vw - 32px);
}

@utility compare-tray-w-desktop {
  max-width: calc(100vw - 260px);
}

@utility compare-grid-2 {
  grid-template-columns: minmax(72px, 96px) 1fr 1fr;
}

@utility compare-grid-3 {
  grid-template-columns: minmax(72px, 96px) 1fr 1fr 1fr;
}

@utility compare-card-grid-2 {
  grid-template-columns: minmax(72px, 96px) 1fr 1fr;
}

@utility compare-card-grid-3 {
  grid-template-columns: minmax(72px, 96px) 1fr 1fr 1fr;
}

@utility compare-grid-4 {
  grid-template-columns: minmax(72px, 96px) 1fr 1fr 1fr 1fr;
}

@utility compare-card-grid-4 {
  grid-template-columns: minmax(72px, 96px) 1fr 1fr 1fr 1fr;
}

@utility compare-col {
  min-width: 140px;
}

@utility funnel-grid-desktop {
  grid-template-columns: minmax(0, 9.5rem) 1fr 4.5rem;
}

@utility funnel-grid-mobile {
  grid-template-columns: minmax(0, 7rem) 1fr 3.75rem;
}

@utility merchant-dashboard-grid {
  grid-template-columns: 3fr 2fr;
}

@utility max-w-chat-user {
  max-width: 82%;
}

@utility z-base {
  z-index: var(--z-base);
}

@utility z-dock {
  z-index: var(--z-dock);
}

@utility z-elevated {
  z-index: var(--z-elevated);
}

@utility z-sticky {
  z-index: var(--z-sticky);
}

@utility z-drawer {
  z-index: var(--z-drawer);
}

@utility z-modal {
  z-index: var(--z-modal);
}

@utility z-orb {
  z-index: var(--z-orb);
}

@utility z-popover {
  z-index: var(--z-popover);
}

@utility z-bubble {
  z-index: var(--z-bubble);
}

@utility z-dialog {
  z-index: var(--z-dialog);
}

@utility z-tooltip {
  z-index: var(--z-tooltip);
}

@utility z-toast {
  z-index: var(--z-toast);
}

@utility z-spotlight {
  z-index: var(--z-spotlight);
}

@utility z-grain {
  z-index: var(--z-grain);
}
`;
}

function generateTS(): string {
  return `/** AUTO-GENERATED from src/tokens/definitions.ts — DO NOT EDIT DIRECTLY */

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
    base: ${tokenDefinitions.zIndex.base},
    dock: ${tokenDefinitions.zIndex.dock},
    elevated: ${tokenDefinitions.zIndex.elevated},
    sticky: ${tokenDefinitions.zIndex.sticky},
    drawer: ${tokenDefinitions.zIndex.drawer},
    modal: ${tokenDefinitions.zIndex.modal},
    orb: ${tokenDefinitions.zIndex.orb},
    popover: ${tokenDefinitions.zIndex.popover},
    bubble: ${tokenDefinitions.zIndex.bubble},
    toast: ${tokenDefinitions.zIndex.toast},
    spotlight: ${tokenDefinitions.zIndex.spotlight},
    grain: ${tokenDefinitions.zIndex.grain},
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
`;
}

function run() {
  const css = generateCSS();
  const ts = generateTS();

  fs.writeFileSync(path.join(stylesDir, "tokens.css"), css, "utf-8");
  fs.writeFileSync(path.join(stylesDir, "tokens.ts"), ts, "utf-8");

  console.log("Tokens generated successfully in src/styles/tokens.css and src/styles/tokens.ts");
}

run();
