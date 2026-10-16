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
  --z-popover: ${zIndex.popover};
  --z-bubble: ${zIndex.bubble};
  --z-modal: ${zIndex.modal};
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
    base: 0,
    dock: 10,
    elevated: 20,
    sticky: 30,
    drawer: 40,
    popover: 50,
    bubble: 55,
    modal: 60,
    toast: 70,
    spotlight: 80,
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
