# Z-Index Scale & Stacking Order

Persona enforces a strictly tokenized, single-source-of-truth z-index scale defined in `src/tokens/definitions.ts` and generated into `src/styles/tokens.css` and `src/styles/tokens.ts`. Raw integer z-index values outside these semantic tokens are flagged and forbidden by `check_tokens`.

---

## 1. Scale Overview

| Layer Token | Utility Class | Value | Purpose & Stacking Order |
|---|---|---|---|
| `base` | `z-base` | `0` | Default document flow, static grid cards, background elements. |
| `dock` | `z-dock` | `10` | Subtle resting docks, bottom trays in idle states. |
| `elevated` | `z-elevated` | `20` | Hover states, card hover lift, floating compare tray. |
| `sticky` | `z-sticky` | `30` | Sticky navigation bar, sticky comparison table headers and first column. |
| `spotlight` | `z-spotlight` | `35` | Onboarding tour highlight cutouts and element rings. Sits on content, below drawers, orb, and bubble. |
| `drawer` | `z-drawer` | `40` | Side drawers (cart, history) and peek modes. Below modals and blocking overlays. |
| `modal` | `z-modal` | `50` | Full-screen modal backdrops, standard dialog scrims. |
| `orb` | `z-orb` | `55` | Pip's Three.js WebGL orb container. Sits above drawers and standard modals. |
| `popover` | `z-popover` | `60` | Dropdown menus, Pip's ⋯ action menu, filter flyouts. |
| `bubble` | `z-bubble` | `65` | Pip's speech bubble and tour dialog cards. Always above the orb canvas. |
| `dialog` | `z-dialog` | `70` | Critical blocking dialogs and confirmations that require user input. |
| `tooltip` | `z-tooltip` | `75` | Micro-help hover and focus tooltips. |
| `toast` | `z-toast` | `80` | Transient system notifications and action confirmations. |
| `grain` | `z-grain` | `100` | Atmospheric background noise and film grain texture overlay (`pointer-events-none`). |

---

## 2. Core Stacking Rules

1. **Companion Hierarchy (`z-orb: 55` $\rightarrow$ `z-bubble: 65`)**:
   Pip's speech bubble always stacks higher than the orb canvas so that the bubble tail and message container are never clipped or obscured by the orb itself.
2. **Blocking Dialogs Preempt the Companion (`z-dialog: 70 > z-bubble: 65`)**:
   When a blocking dialog requires explicit user confirmation (e.g. checkout confirmation or reset modal), it takes priority over Pip's roaming bubble.
3. **Sticky Elements (`z-sticky: 30`)**:
   Table headers and sticky attribute columns anchor above scrolling rows (`z-base: 0`) while resting safely beneath drawers (`z-drawer: 40`) and modals (`z-modal: 50`).
4. **Clamping & Bounds Guard**:
   Regardless of z-index, Pip's motion pilot (`pilot.ts`) computes bounding boxes for sticky headers, drawers, tables, and modal controls, automatically clamping and repelling the orb so it never visually obstructs interactive UI.
