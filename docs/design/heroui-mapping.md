# HeroUI Component Mapping Specification

**Version:** 1.0.0  
**Status:** Stage 0 Deliverable (Audit & Spike)  
**System:** Persona Design System (tmgnisc / Ai-builder-cup)  
**Framework:** React 19 · Next.js 15 (App Router) · Tailwind CSS v4 · `@heroui/react` v3.2.6 · `@heroui/styles` v3.2.6

---

## 1. Overview

This document defines the implementation strategy for all 21 UI primitives required across Persona. It standardizes component architecture using HeroUI v3 (built on React Aria Components), ensuring total visual cohesion, full keyboard/screen-reader accessibility (WCAG 2.1 AA), and zero bundle bloat.

### Component Strategy Classification
Every primitive is categorized into one of three implementation strategies:
1. **Keep HeroUI as is:** Used directly with default props and semantic token class overrides.
2. **Wrap HeroUI with tokens:** Wrapped in a thin project component (`src/components/ui/*`) to enforce strict Persona radius, hairline border, elevation, focus rings, and size scales.
3. **Build on React Aria Components:** Built directly on React Aria primitives only when HeroUI v3 lacks required layout composition, mobile scroll snapping, or specialized DOM semantics.

---

## 2. Primitives Mapping (21 Primitives)

| # | Primitive | Strategy | Underlying Component | Wrapper Location / Props | Rationale & Token Binding |
|---|---|---|---|---|---|
| 1 | **Button** | Wrap HeroUI with tokens | `@heroui/react` `Button` | `src/components/ui/Button.tsx`<br>Props: `variant: 'primary' \| 'outline' \| 'ghost' \| 'subtle'`, `size: 'sm' \| 'md' \| 'lg'`, `isIconOnly?: boolean` | Replaces all arbitrary pill buttons (`rounded-full`) with Persona's unified radius scale (`rounded-lg` / 8px). Enforces 1px hairline border for outline, dark text on dark-theme accent button, and high-contrast focus rings. |
| 2 | **Input** | Wrap HeroUI with tokens | `@heroui/react` `Input` | `src/components/ui/Input.tsx`<br>Props: `size: 'sm' \| 'md'`, `label?: string`, `isSearch?: boolean` | Normalizes input heights across Pip, search, filters, and checkout. Enforces `bg-surface`, `border-border`, `focus-visible:outline-2 focus-visible:outline-accent-text`, and consistent label typography. |
| 3 | **Select** | Keep HeroUI as is | `@heroui/react` `Select`, `ListBox`, `ListBox.Item` | Direct import<br>Uses `Select.Trigger`, `Select.Value`, `Select.Popover` | Native React Aria keyboard navigation, accessible popup semantics, and automatic positioning. Styled with `bg-surface` and `border-border`. |
| 4 | **Checkbox** | Keep HeroUI as is | `@heroui/react` `Checkbox` | Direct import<br>Props: `size: 'sm' \| 'md'` | Built-in accessible checkbox with indeterminate state, focus rings, and semantic check indicator. Uses `--accent` token for checked fill. |
| 5 | **Switch** | Keep HeroUI as is | `@heroui/react` `Switch` | Direct import<br>Props: `size: 'sm'` | Used for "Show differences only" in `/compare`. Provides smooth spring animation and accessible ARIA switch semantics without external dependencies. |
| 6 | **Slider** | Wrap HeroUI with tokens | `@heroui/react` `Slider` | `src/components/ui/PriceSlider.tsx`<br>Props: `minValue`, `maxValue`, `value`, `onChange` | Used in category price range filtering. Standardizes thumb size (16px), track hairline border, and formats values into Nepalese Rupees (`NPR`). |
| 7 | **Chip** | Wrap HeroUI with tokens | `@heroui/react` `Chip` | `src/components/ui/Chip.tsx`<br>Props: `variant: 'soft' \| 'outline'`, `color: 'default' \| 'success' \| 'warning' \| 'accent'` | Standardizes tag and spec badge chips. Banned pill proliferation: uses `rounded-md` (6px) with restrained tint backgrounds instead of `rounded-full` pills. |
| 8 | **Badge** | Keep HeroUI as is | `@heroui/react` `Badge`, `Badge.Anchor` | Direct import<br>Props: `color: 'accent' \| 'danger'`, `placement: 'top-right'` | Overlays notification and cart count numbers on header buttons with `tabular-nums`. |
| 9 | **Card** | Wrap HeroUI with tokens | `@heroui/react` `Card` | `src/components/ui/Card.tsx`<br>Props: `Card.Header`, `Card.Title`, `Card.Content`, `Card.Footer` | Replaces fragmented `rounded-2xl`, `rounded-card`, and `rounded-xl` with unified 12px radius, 1px hairline border (`hairline`), `bg-surface`, and no drop shadows (hairlines over shadows). |
| 10 | **Table** | Keep HeroUI as is | `@heroui/react` `Table`, `Table.ScrollContainer`, `Table.Content`, `Table.Header`, `Table.Column`, `Table.Body`, `Table.Row`, `Table.Cell` | Direct import / Shared | Complete collection-based table semantics (`caption`, `th` scope `col`/`row`), keyboard row navigation, and horizontal scroll containment. |
| 11 | **Tabs** | Keep HeroUI as is | `@heroui/react` `Tabs`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panel` | Direct import<br>Props: `variant: 'underlined' \| 'solid'` | Full ARIA tablist/tab/tabpanel keyboard accessibility (arrow key switching). Used for device spec categories and view switching. |
| 12 | **Tooltip** | Keep HeroUI as is | `@heroui/react` `Tooltip`, `Tooltip.Trigger`, `Tooltip.Content` | Direct import<br>Props: `placement: 'top' \| 'bottom'` | Accessible hover and focus popups for spec abbreviations and delivery info. Bound to `--z-tooltip` (75). |
| 13 | **Popover** | Keep HeroUI as is | `@heroui/react` `Popover`, `Popover.Trigger`, `Popover.Dialog`, `Popover.Content` | Direct import<br>Props: `placement: 'bottom-end'` | Floating interactive panels for filter popups and header menus. Bound to `--z-popover` (60) with `bg-surface` and `hairline`. |
| 14 | **Modal** | Keep HeroUI as is | `@heroui/react` `Modal`, `Modal.Backdrop`, `Modal.Container`, `Modal.Dialog`, `Modal.Header`, `Modal.Body`, `Modal.Footer` | Direct import<br>Props: `isOpen`, `onOpenChange` | Full modal dialog accessibility (focus trapping, Escape key dismissal, body scroll lock, screen reader alerts). Stacks cleanly at `--z-modal` (50). |
| 15 | **Drawer** | Keep HeroUI as is | `@heroui/react` `Drawer`, `Drawer.Backdrop`, `Drawer.Content`, `Drawer.Dialog`, `Drawer.Header`, `Drawer.Body`, `Drawer.Footer` | Direct import<br>Props: `isOpen`, `onOpenChange`, `placement: 'right' \| 'bottom'` | Used for CartDrawer, mobile filter drawer, and compare preview drawer. Fully accessible off-canvas panel with `--z-drawer` (40). |
| 16 | **Toast** | Keep HeroUI as is | `@heroui/react` `Toast`, `Toast.Provider`, `Toast.toast` | Direct import / Root provider | Statically positioned toast queue for inventory confirmations and cart mutations. Stacks at `--z-toast` (80) with accessible live region announcements. |
| 17 | **Alert** | Keep HeroUI as is | `@heroui/react` `Alert`, `Alert.Title`, `Alert.Description` | Direct import<br>Props: `status: 'accent' \| 'success' \| 'warning' \| 'danger'` | Standardized inline alert banner for inventory verification notes, out-of-stock winner warnings, and delivery caveats. |
| 18 | **Skeleton** | Keep HeroUI as is | `@heroui/react` `Skeleton` | Direct import<br>Props: `className` | Non-jarring pulse shimmer loading placeholders for product grids, spec tables, and images. Respects `prefers-reduced-motion`. |
| 19 | **ScrollShadow** | Keep HeroUI as is | `@heroui/react` `ScrollShadow` | Direct import<br>Props: `orientation: 'horizontal' \| 'vertical'` | Seamless top/bottom/left/right fading mask indicating scrollable content without ugly scrollbars. Used in table cells and spec sheets. |
| 20 | **Avatar** | Keep HeroUI as is | `@heroui/react` `Avatar`, `Avatar.Image`, `Avatar.Fallback` | Direct import<br>Props: `size: 'sm' \| 'md' \| 'lg'` | Used for user profiles and fallback Pip companion avatar. |
| 21 | **Dropdown** | Keep HeroUI as is | `@heroui/react` `Dropdown`, `Dropdown.Trigger`, `Dropdown.Popover`, `Dropdown.Menu`, `Dropdown.Item` | Direct import<br>Props: `selectionMode` | Keyboard-accessible action menus for product card actions, category navigation, and profile menus. |

---

## 3. Custom Domain Components Kept in Project

The following 9 components are proprietary to Persona's shopping companion and agentic commerce platform. They remain project-owned, utilizing our design tokens and HeroUI primitives where applicable:

1. **`PipOrb` (`src/features/companion/PipCanvas.tsx`, `PipScene.tsx`, `PipRenderer.tsx`)**
   - Three.js WebGL canvas and shader animation representing Pip's 3D ambient presence.
   - *Status:* Approved as is. No visual or shader modifications.
2. **`PipBubble` (`src/features/companion/BubbleLayer.tsx`)**
   - Floating companion dialog bubble anchored dynamically to catalog cards and page targets.
   - Uses `surface-solid`, `hairline`, `--z-bubble` (65), and collision geometry rejection algorithms.
3. **`PipDock` (`src/features/companion/CompanionLayer.tsx`)**
   - Bottom parking dock reserving layout space (`pb-32` clearance) on desktop and mobile.
4. **`Waveform` (`src/features/companion/chat/Waveform.tsx`)**
   - Interactive audio voice listening visualizer responding to mic input amplitude.
5. **`ProductCard` (`src/features/catalog/ProductCard.tsx`)**
   - 1:1 photograph aspect ratio card with verified stock badges, tabular currency pricing, and compare toggle.
   - Refactored in Stage 2 to use HeroUI `Card`, `Button`, and `Chip`.
6. **`CompareTable` (`src/features/compare/CompareWorkspace.tsx`)**
   - Complex responsive hardware spec comparison table with sticky spec column, scroll-snap mobile columns, normalized units, and "show differences only" filtering.
   - Refactored to leverage HeroUI `Table.ScrollContainer` and `Table.Content`.
7. **`VerdictScoreBar` (`src/features/compare/VerdictPanel.tsx`)**
   - Visual comparison score differential display with 2.0 margin threshold and grounded spec attribution.
8. **`Price` (`src/components/ui/Price.tsx`)**
   - Formatter component displaying currency with tabular numerals (`tnum`) and font-mono.
9. **`StatusBadge` (`src/components/ui/StatusBadge.tsx`)**
   - Domain inventory status badge (In Stock, Low Stock, Out of Stock, Best Value) with non-color accessibility cues.

---

## 4. HeroUI v3 Architecture & Gotchas Documented

During the Stage 0 spike on React 19 and Tailwind CSS v4, the following critical architecture facts and gotchas were uncovered:

1. **Table Collection Context Requirement:**
   - *Gotcha:* In HeroUI v3, `<Table>` is `TableRoot` which renders an outer container `<div>`. Calling `<Table.Header>` or `<Table.Body>` directly inside `<Table>` throws a React Aria runtime error: `Header cannot be rendered outside a collection.`
   - *Resolution:* Tables must always wrap their collection children inside `<Table.ScrollContainer>` and `<Table.Content>`:
     ```tsx
     <Table>
       <Table.ScrollContainer>
         <Table.Content>
           <Table.Header>...</Table.Header>
           <Table.Body>...</Table.Body>
         </Table.Content>
       </Table.ScrollContainer>
     </Table>
     ```
2. **Chip Variant Types:**
   - *Gotcha:* Unlike buttons which accept `"solid" | "outline" | "ghost"`, HeroUI v3 `Chip` accepts variants `"primary" | "secondary" | "tertiary" | "soft"`. Specifying `"outline"` causes a TypeScript compilation error.
   - *Resolution:* Persona Chip wrappers standardize on `"soft"` and `"secondary"` with hairline borders.
3. **Toast API Function Signature:**
   - *Gotcha:* `Toast.toast` is callable directly as a function `Toast.toast(title, options)` or via convenience methods (`Toast.toast.success(...)`). It does not have an `.add({})` method.
4. **CSS Import & Precedence Order:**
   - In `src/styles/globals.css`, styles are structured in exact priority order:
     ```css
     @import "tailwindcss";
     @import "@heroui/styles";
     @import "./tokens.css";
     ```
     This ensures our semantic tokens (`tokens.css`) take absolute precedence over HeroUI defaults, while Tailwind utilities can override component styles where required.
5. **Zero Shared Chunk Bundle Overhead:**
   - Next.js production build verification demonstrated that shared chunks remained exactly **103 kB** with **0 kB delta** across main routes (`/`, `/compare`, `/product/[id]`), proving `@heroui/react` v3 tree-shaking is 100% effective.

---

## 5. Implementation Status: HeroUI Primitives vs Custom Components

### A. Migrated to HeroUI v3 (Active in Codebase)
| Component | Status | Implementation Details |
|---|---|---|
| **Button** | ✅ Active | Wrapped `@heroui/react` `Button`, strict `rounded-lg` (8px) radius scale, `buttonClasses` helper for server links |
| **IconButton** | ✅ Active | Wrapped with `data-slot="button"`, `data-rac=""`, size tokens (sm: 32px, md: 40px, lg: 48px), tooltip, accessible label |
| **Input** | ✅ Active | Wrapped `@heroui/react` `Input`, high contrast border, clear button support |
| **Select** | ✅ Active | Wrapped `@heroui/react` `Select`, accessible listbox and keyboard arrow navigation |
| **Checkbox** | ✅ Active | Standardized on `@heroui/react` `Checkbox` in `Filters.tsx` |
| **Switch** | ✅ Active | Standardized on `@heroui/react` `Switch` in `Filters.tsx` and `/compare` |
| **Card** | ✅ Active | Wrapped `@heroui/react` `Card`, 12px card radius, hairline 1px border over shadows |
| **Chip** | ✅ Active | Wrapped `@heroui/react` `Chip`, `rounded-md` (6px) tag styling, no pill shapes |
| **Skeleton** | ✅ Active | Standardized on `@heroui/react` `Skeleton` for loading states |

### B. Primitives Scheduled for Stage 2 Expansion
| Component | Scheduled Strategy | Target Wrapper / Integration |
|---|---|---|
| **Slider** | Stage 2 Wrap | Wrap `@heroui/react` `Slider` for category price range filter |
| **Badge** | Stage 2 Wrap | Wrap `@heroui/react` `Badge` for header cart count and notifications |
| **Table** | Stage 2 Wrap | Wrap `@heroui/react` `Table` collection components for `/compare` tabular matrix |
| **Tabs** | Stage 2 Wrap | Wrap `@heroui/react` `Tabs` for product specs and view toggles |
| **Tooltip** | Stage 2 Wrap | Wrap `@heroui/react` `Tooltip` with CSS-only fallback |
| **Modal / Dialog** | Stage 2 Wrap | Wrap `@heroui/react` `Modal` for checkout and alert dialogs |
| **Drawer** | Stage 2 Wrap | Wrap `@heroui/react` `Drawer` for CartDrawer and mobile filter sheet |
| **Toast** | Stage 2 Direct | Direct `@heroui/react` `Toast` provider for action confirmations |
| **Alert** | Stage 2 Direct | Direct `@heroui/react` `Alert` for stock caveat and cross-category notices |
| **ScrollShadow** | Stage 2 Direct | Direct `@heroui/react` `ScrollShadow` for long spec lists |
| **Avatar** | Stage 2 Direct | Direct `@heroui/react` `Avatar` for user profile |
| **Dropdown** | Stage 2 Direct | Direct `@heroui/react` `Dropdown` for contextual menus |

### C. Retained Custom Domain Components
These 9 components remain project-owned domain components, styled using Persona design tokens:
1. `PipOrb`: Three.js WebGL canvas and shader animation (approved as is).
2. `PipBubble`: Custom floating companion bubble with collision geometry rejection and tail positioning.
3. `PipDock`: Persistent docked companion bottom bar with audio waveform and prompt input.
4. `Waveform`: Real-time audio frequency visualizer for mic input.
5. `ProductCard`: Grid card showing 4:3 product image, brand, name, compact spec line, price, and verified quick-add button.
6. `CompareTable`: Complex multi-column hardware matrix with difference-only filtering, sticky spec headers, and mobile swipe snap.
7. `VerdictScoreBar`: Pip recommendation differential bar with 2.0 margin threshold.
8. `NepaliPrice`: South-Asian digit grouping (`NPR 1,20,000`) with tabular numerals.
9. `StatusBadge`: Inventory availability pill with semantic color and text label for screen readers.
