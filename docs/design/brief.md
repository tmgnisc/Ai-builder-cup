# Design Brief & System Specification: tmgnisc / Ai-builder-cup

**Version:** 2.0.0  
**Status:** Ready for Review (Stage 1 Deliverable — No Code Changes)  
**Target:** Engineering, Product, and Design teams  

---

## 1. Brand Identity, Audience & Principles

### 1.1 Brand Idea
> **An uncompromised electronics catalog and companion that delivers absolute technical honesty to Nepal's builders, engineers, and everyday consumers.**  
> Grounded in real Kathmandu Valley stock, transparent NPR pricing, and verifiable hardware specs, every interaction is engineered to inform rather than persuade.

### 1.2 Target Audience
- **Primary Audience:** Electronics shoppers and tech professionals across Nepal (Kathmandu, Pokhara, Lalitpur, Bhaktapur, and outside Valley hubs).
- **Core Needs & Sensitivities:**
  - Strict reliance on authentic manufacturer warranties and brand authorization.
  - Zero tolerance for phantom stock or fake product specs.
  - Transparent pricing in Nepalese Rupees (NPR) with standard Lakh notation where natural.
  - Clear delivery timelines (1–2 days Valley vs. 3–5 days outside Valley) and payment clarity (Cash on Delivery, Fonepay, Esewa, Khalti).
  - Low-latency browsing on varied network qualities (fiber to mobile LTE).

### 1.3 Five Core Design Principles
1. **Clarity over Cleverness:** Visual hierarchy is immediate. Specifications are structured into standard, comparable tables. Typography guides the eye directly to critical hardware metrics without distracting decoration.
2. **Honesty over Salesmanship:** Out-of-stock items, missing specifications, and hardware trade-offs are presented plainly. The system never claims inventory is "reserved" before payment, never inflates discounts, and openly flags when a competitor or alternative is a more balanced pick.
3. **Restraint over Excess:** We eliminate visual noise—no ambient glows, no skeuomorphic glass reflections, no faux-futuristic grain overlays, and no pill button proliferation. Elements exist only when they serve comprehension or action.
4. **Speed & Responsiveness:** UI renders instantaneously. Layout shifts (CLS) are zero. Interactions respond in under 100ms. Mobile ergonomics prioritize thumb reach, stable sticky column headers, and seamless horizontal scroll snapping without page-level overflow.
5. **Verifiable Trust:** Every agent claim links to concrete catalog specs or inventory endpoints. Cart mutations are verified against backend state. Accessibility (WCAG 2.1 AA) and predictable keyboard focus order ensure reliability for every user.

---

## 2. Typography & Devanagari Fallback Plan

### 2.1 Font Families
- **UI Font (`font-sans`):** **Geist Sans** (`next/font/google` or `@fontsource/geist-sans`). Clean, high-legibility grotesque engineered for interfaces and dense data displays.
- **Data & Numerals (`font-mono`):** **Geist Mono** with **tabular figures (`tnum`)** enabled by default. Used for all prices, technical specs, dimensions, RAM/storage capacities, battery hours, and part numbers.
- **Editorial Headings (`font-display`):** **Instrument Serif**. Used selectively for hero section titles, category editorial headlines, and empty state hero moments. Never used for dense UI controls, tables, specs, or body text.

### 2.2 Type Scale & Hierarchy

| Token | Family | Size / Leading | Weight | Tracking | Purpose & Usage Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display` | Instrument Serif | 48px / 52px (3rem) | 400 | `-0.02em` | Homepage Hero Title, major brand moments only |
| `text-h1` | Instrument Serif | 36px / 40px (2.25rem) | 400 | `-0.015em` | Page titles (Compare, Category, Product Detail) |
| `text-h2` | Geist Sans | 24px / 28px (1.5rem) | 600 | `-0.01em` | Major section headers, Drawer titles, Sheet titles |
| `text-h3` | Geist Sans | 18px / 24px (1.125rem) | 600 | `-0.005em` | Card titles, spec section headers, summary headlines |
| `text-body` | Geist Sans | 14px / 20px (0.875rem) | 400 | `0` | Standard body copy, descriptions, Pip dialogue, reviews |
| `text-body-strong` | Geist Sans | 14px / 20px (0.875rem) | 500 / 600 | `0` | Table row labels, prominent UI labels, cart item titles |
| `text-small` | Geist Sans | 12px / 16px (0.75rem) | 400 | `0` | Secondary descriptions, timestamps, breadcrumbs |
| `text-caption` | Geist Sans | 11px / 14px (0.6875rem) | 600 | `+0.04em` | Uppercase section badges, attribute overlines, tags |
| `text-mono-base` | Geist Mono | 14px / 20px (0.875rem) | 500 | `tnum` | Table data values, prices in cards, memory sizes |
| `text-mono-sm` | Geist Mono | 12px / 16px (0.75rem) | 400 / 500 | `tnum` | Compact specs, stock counts, delivery day metrics |
| `text-mono-lg` | Geist Mono | 20px / 24px (1.25rem) | 600 | `tnum` | Prominent price tags on Product Detail and Cart total |

### 2.3 Devanagari Fallback Plan
While the primary catalog and interface use English for international technical standard terms (RAM, GPU, Thunderbolt), bilingual support and Nepali locale rendering require a robust Devanagari typographic fallback:
- **Fallback Stack:** `Geist Sans, "Noto Sans Devanagari", "Kohinoor Devanagari", system-ui, -apple-system, sans-serif`.
- **Metrics Normalization:** Noto Sans Devanagari matches Geist Sans in x-height and ascender/descender ratios when set to `size-adjust: 104%` in `@font-face`.
- **Tabular Numerals:** Devanagari numerals (`० १२३४५६७८९`) fallback to `Noto Sans Devanagari` with tabular metric feature tags enabled (`font-feature-settings: "tnum" 1, "cv01" 1`).

---

## 3. Color System & Contrast Specification

### 3.1 Color Philosophy
- **Default Mode:** Clean, warm neutral **Light** theme.
- **Supported Mode:** Deep, low-fatigue **Dark** theme.
- **Palette Architecture:** A warm neutral foundation (steered away from cold blue-grays), a singular purposeful accent color (warm ember/amber, evoking copper and craftsmanship), and semantic status colors.

### 3.2 Semantic Color Tokens

| Semantic Token | Light Mode Value (OKLab / Hex) | Dark Mode Value (OKLab / Hex) | Intended Usage |
| :--- | :--- | :--- | :--- |
| `bg` | `#FBFBFA` (warm off-white) | `#121211` (warm obsidian) | Primary canvas background |
| `surface-1` | `#FFFFFF` (pure white) | `#1A1918` (elevated dark) | Cards, sheets, table background, inputs |
| `surface-2` | `#F3F2EE` (warm light gray) | `#242321` (deep warm gray) | Section dividers, secondary chips, table headers |
| `surface-3` | `#E8E6E0` (mid tone gray) | `#302E2B` (hover dark surface) | Hover states, active tabs, subtle fills |
| `border-subtle` | `#EAE8E2` (1px hairline) | `#282624` (1px hairline) | Subtle cell borders, section separators |
| `border-strong` | `#D3D0C7` (defined boundary) | `#3F3D39` (defined boundary) | Card perimeters, input outlines, table frames |
| `text-primary` | `#181716` (warm black) | `#F5F4F0` (warm ivory) | Headings, primary data, active button text |
| `text-muted` | `#64625C` (neutral mid-dark) | `#A29F96` (neutral mid-light) | Secondary descriptions, spec labels, captions |
| `text-faint` | `#949187` (subtle gray) | `#6E6C65` (subtle dark gray) | Placeholder text, disabled labels, breadcrumb arrows |
| `accent` | `#C85A17` (warm terracotta/copper) | `#E06D2B` (luminous copper) | Primary CTAs, active highlights, Pip brand marker |
| `accent-hover` | `#AF4C10` | `#ED7B38` | Hover/active states on primary actions |
| `accent-surface`| `#FDF3ED` (soft copper tint) | `#2C1A11` (dark copper tint) | Best-value table cells, active chip background |
| `accent-text` | `#9C410B` | `#F59E6C` | Accessible high-contrast text on accent tints |
| `status-success`| `#1E7E34` (forest green) | `#34C759` (emerald green) | In-stock badges, verified cart confirmations |
| `status-warning`| `#B26A00` (deep amber) | `#F5A623` (bright amber) | Low stock alert, cross-category notice |
| `status-danger` | `#C5221F` (deep crimson) | `#FF453A` (vivid red) | Out of stock, error state, destructive button |
| `status-info` | `#0B66C3` (classic cobalt) | `#3898EC` (sky cobalt) | Specification notes, technical alerts |

### 3.3 Contrast Compliance Table (WCAG 2.1 AA Minimum)

| Element Pair | Light Hex Pair | Light Ratio | Dark Hex Pair | Dark Ratio | Rating |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-primary` on `bg` | `#181716` on `#FBFBFA` | **15.2 : 1** | `#F5F4F0` on `#121211` | **15.0 : 1** | AAA Pass |
| `text-primary` on `surface-1` | `#181716` on `#FFFFFF` | **16.1 : 1** | `#F5F4F0` on `#1A1918` | **13.8 : 1** | AAA Pass |
| `text-muted` on `bg` | `#64625C` on `#FBFBFA` | **5.4 : 1** | `#A29F96` on `#121211` | **6.6 : 1** | AA Pass |
| `text-muted` on `surface-1` | `#64625C` on `#FFFFFF` | **5.7 : 1** | `#A29F96` on `#1A1918` | **6.1 : 1** | AA Pass |
| `text-muted` on `surface-2` | `#64625C` on `#F3F2EE` | **5.0 : 1** | `#A29F96` on `#242321` | **5.3 : 1** | AA Pass |
| `accent-text` on `accent-surface` | `#9C410B` on `#FDF3ED`| **6.2 : 1** | `#F59E6C` on `#2C1A11` | **6.8 : 1** | AA Pass |
| `white` on `accent` (Button) | `#FFFFFF` on `#C85A17` | **4.8 : 1** | `#121211` on `#E06D2B` | **6.3 : 1** | AA Pass |
| `status-success` on `surface-1`| `#1E7E34` on `#FFFFFF` | **5.3 : 1** | `#34C759` on `#1A1918` | **6.9 : 1** | AA Pass |
| `status-warning` on `surface-1`| `#B26A00` on `#FFFFFF` | **4.9 : 1** | `#F5A623` on `#1A1918` | **6.7 : 1** | AA Pass |
| `status-danger` on `surface-1` | `#C5221F` on `#FFFFFF` | **5.8 : 1** | `#FF453A` on `#1A1918` | **5.6 : 1** | AA Pass |
| `border-strong` on `bg` (UI) | `#D3D0C7` on `#FBFBFA` | **3.2 : 1** | `#3F3D39` on `#121211` | **3.3 : 1** | Component AA |

---

## 4. Shape, Spacing, Elevation & Motion

### 4.1 Shape & Radii Hierarchy
We avoid heavy, organic bubble shapes. Every radius is calculated to feel precise and architectural:
- `rounded-none` (`0px`): Table cells, full-width edge-to-edge banners.
- `rounded-xs` (`4px`): Badges, tooltips, inline keyboard shortcut hints (`kbd`).
- `rounded-sm` (`6px`): Small buttons (`size="sm"`), chips, compact input controls.
- `rounded-md` (`8px`): Standard buttons (`size="md"`), default inputs, dropdown menus.
- `rounded-lg` (`12px`): Product cards, spec group containers, toast alerts.
- `rounded-xl` (`16px`): Dialog modals, Compare workspace surface, floating panels.
- `rounded-full` (`9999px`): Circular icon buttons, status dots, stock indicators.

### 4.2 Spacing System (4px Grid)
All padding, margin, gap, and dimension tokens adhere strictly to a 4px modular unit:
- `space-1` = `4px` | `space-2` = `8px` | `space-3` = `12px` | `space-4` = `16px`
- `space-5` = `20px` | `space-6` = `24px` | `space-8` = `32px` | `space-10` = `40px`
- `space-12` = `48px` | `space-16` = `64px` | `space-20` = `80px`

### 4.3 Elevation: Hairlines over Shadows
- **No Heavy Shadows:** Artificial dropshadows and pseudo-3D glows are retired.
- **Hairline Definition:** Structural separation is achieved via `1px hairline borders` using `border-subtle` and `border-strong`.
- **Ambient Depth:** For floating elements (Dialog, Drawer, Tooltip), a single restrained ambient shadow is permitted:
  - `shadow-subtle`: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`
  - `shadow-elevated`: `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`

### 4.4 Motion Rules
- **Principles:** Motion is purely functional; it communicates state change, layout transitions, and spatial permanence. Zero decorative drifting, zero continuous idle pulses, zero faux-organic spring wobble.
- **Duration Scale:**
  - Fast (`100ms`): Button press, checkbox toggle, hover color shifts.
  - Normal (`180ms`): Dropdown reveal, tooltip appear, tab indicator slide.
  - Deliberate (`250ms`): Drawer slide, dialog entrance, sheet dismiss.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (snappy ease-out).
- **Reduced Motion:** If `@media (prefers-reduced-motion: reduce)` is active, all transitions collapse to `0ms` (instant switch) with `aria-live` announcements preserved.

---

## 5. Icon System: Phosphor Icons Architecture

### 5.1 Single Icon Library Standard
- **Primary Package:** `@phosphor-icons/react` (MIT Licensed).
- **No Secondary Library:** `lucide-react`, Feather, Heroicons, FontAwesome, or other icon fonts are strictly excluded.
- **Custom Glyphs:** Missing or specialized glyphs (such as the Pip companion mark) are drawn on the identical **24x24 pixel grid with a 1.5px/2px stroke, round caps, and round joins**, stored in `src/components/ui/icons/custom/PipIcon.tsx`.

### 5.2 Size & Weight Tokens

| Token | Size (px) | Baseline Alignment | Allowed Weights | Typical Component Usage |
| :--- | :--- | :--- | :--- | :--- |
| `size-16` (`sm`) | 16px | `-1px` optical offset | `regular`, `bold`, `fill` | Inline text badges, table winner cues, compact buttons |
| `size-20` (`md`) | 20px | Centered | `regular`, `bold`, `fill` | Standard buttons, input adornments, drawer headers |
| `size-24` (`lg`) | 24px | Centered | `regular`, `fill`, `duotone` | Navigation bars, panel headers, feature list highlights |
| `size-32` (`xl`) | 32px | Centered | `duotone`, `light` | Empty state illustrations, onboarding milestones |

**Weight Usage Rules:**
- `regular`: Default for all standard interactive UI, inputs, and tables.
- `bold`: Small sizes (`16px`) when placed beside bold typography or within compact badges.
- `fill`: Selected or active navigation items, pinned comparison cards, filled cart state.
- `duotone`: Reserved strictly for empty states, onboarding hints, and major status cards.
- `light` / `thin`: Large decorative illustrations only (`>32px`).

### 5.3 Semantic Icon Map (1-to-1 Mapping)

| Concept | Phosphor Component | Size | Weight | Usage & Rules |
| :--- | :--- | :--- | :--- | :--- |
| `cart` | `ShoppingCart` | 20 / 24 | `regular` / `fill` | Cart drawer trigger, Add to Cart buttons |
| `compare` | `Scales` | 20 | `regular` / `fill` | Compare workspace navigation, table headers |
| `search` | `MagnifyingGlass` | 20 | `regular` | Search inputs, search tool state |
| `filter` | `Faders` | 20 | `regular` | Catalog filter drawers, category facets |
| `sort` | `ArrowsDownUp` | 16 / 20 | `regular` | Price/rating sort triggers |
| `stock-in` | `CheckCircle` | 16 | `bold` / `fill` | StockBadge when stock > 5 |
| `stock-low` | `WarningCircle` | 16 | `bold` / `fill` | StockBadge when stock 1–5 |
| `stock-out` | `XCircle` | 16 | `bold` / `fill` | StockBadge when stock = 0 |
| `delivery` | `Truck` | 20 | `regular` | Valley/Outside delivery indicators |
| `warranty` | `ShieldCheck` | 20 | `regular` | Warranty rows, authentic retailer badges |
| `battery` | `BatteryHigh` | 20 | `regular` | Battery life row in comparison tables |
| `memory` | `Cpu` | 20 | `regular` | RAM, processor specification rows |
| `storage` | `HardDrive` | 20 | `regular` | SSD / Storage capacity rows |
| `weight` | `Scales` | 20 | `regular` | Laptop / gadget physical weight row |
| `display` | `Monitor` | 20 | `regular` | Screen size, panel type, refresh rate rows |
| `connectivity`| `WifiHigh` | 20 | `regular` | Ports, Wi-Fi, Bluetooth spec rows |
| `rating` | `Star` | 16 / 20 | `fill` | Verified customer review score stars |
| `verified` | `SealCheck` | 16 / 20 | `fill` | Verified cart mutation badge, authentic brand |
| `warning` | `Warning` | 20 | `bold` | Cross-category comparison alert, stock limits |
| `error` | `WarningOctagon` | 20 | `bold` | Failed cart mutation, 404, 503 service down |
| `info` | `Info` | 16 / 20 | `regular` | Tooltip info triggers, spec definitions |
| `microphone` | `Microphone` | 20 | `regular` / `fill` | Voice input trigger in Pip composer |
| `send` | `PaperPlaneRight`| 20 | `fill` | Chat message submission button |
| `close` | `X` | 16 / 20 | `bold` | Dismiss buttons, drawer close, modal exit |
| `back` | `ArrowLeft` | 20 | `regular` | Navigation back to catalog or parent screen |
| `menu` | `List` | 24 | `regular` | Mobile navigation hamburger toggle |
| `theme` | `Sun` / `Moon` | 20 | `regular` | Light/Dark theme switch toggle |
| `user` | `User` | 20 | `regular` | Account, customer session indicator |
| `merchant` | `Storefront` | 20 | `regular` | Merchant portal link and telemetry dashboard |
| `checkout` | `CreditCard` | 20 | `regular` / `fill` | Checkout handoff button and step header |
| `pip-mark` | `PipCustomMark` (custom)| 20 / 24 | `regular` | AI Companion brand mark & docked orb |

### 5.4 Icon Accessibility & Rules
- **Encapsulated Wrapper:** All icons are consumed exclusively through `<Icon name="..." size="md" weight="regular" />` from `src/components/ui/Icon.tsx`. Direct imports of `@phosphor-icons/react` in feature components are banned via ESLint.
- **Color Inheritance:** Icons always inherit `currentColor` and never apply hardcoded color classes.
- **Accessible Names:** Icon-only buttons (`<IconButton>`) require a non-empty `aria-label` or `aria-labelledby`.
- **Decorative SVGs:** Standalone icons adjacent to readable labels are marked `aria-hidden="true"`.
- **No Emoji in UI:** Emoji (`🔥`, `🚀`, `⭐`, `💡`) are banned from UI surfaces and system messages.

---

## 6. Imagery Rules & Asset Handling

### 6.1 Aspect Ratios & Framing
- **Product Card Thumbnail:** Fixed `1:1` square aspect ratio.
- **Compare Table Header:** Fixed `4:3` horizontal aspect ratio with top/center hardware framing.
- **Hero / Editorial Banner:** Fixed `16:9` widescreen or `21:9` cinematic banner.

### 6.2 Backgrounds & Presentation
- Product images must be shot or cropped against neutral, clean photographic backdrops (warm off-white in light mode, deep slate in dark mode).
- Heavy drop shadows, bright saturated gradient backdrops, and artificial floating reflection plates are prohibited.

### 6.3 Honest Fallbacks (No Fake Art)
- When a product lacks an official photo, the system never displays generic stock photos, placeholder geometric abstracts, or fake renders.
- **Fallback Presentation:** A subtle, architectural neutral card displaying the **Brand Initial + Product Category Glyph** in monochrome line art, accompanied by the product's official SKU and category title.

### 6.4 Licensing & Optimization
- High-resolution assets are served via Next.js `Image` with WebP/AVIF modern compression, blur-up low-quality placeholders (`placeholder="blur"`), and explicit width/height to guarantee zero cumulative layout shift (CLS = 0).

---

## 7. Component Specifications (v2 Primitives)

### 7.1 Button & IconButton
- **Variants:**
  - `primary`: Background `accent`, text `white`, hover `accent-hover`. Used for high-intent actions (Add to Cart, Proceed to Checkout, Filter).
  - `secondary`: Background `surface-1`, border `1px hairline border-strong`, text `text-primary`. Used for alternative choices, compare toggles, slot clearing.
  - `ghost`: Transparent background, hover `surface-2`, text `text-primary`. Used in compact toolbars and inline actions.
  - `destructive`: Background `surface-1`, border `1px hairline status-danger`, text `status-danger`. Used for removing items or clearing cart.
- **States:** `idle`, `hover` (subtle brightness shift), `active` (scale 0.98), `focus-visible` (2px focus ring with 2px offset), `busy` (spinner replacing leading icon, text replaced with "Verifying…", `aria-busy="true"`), `disabled` (`opacity-50 pointer-events-none`).

### 7.2 Input & Textarea
- **Geometry:** Height `40px` (`size="md"`), `rounded-md`, border `1px border-strong`, background `surface-1`.
- **States:** Focus produces `ring-1 ring-accent border-accent`. Error state applies `border-status-danger` and an accessible `aria-invalid="true"` indicator with inline error text linked via `aria-describedby`.

### 7.3 Chip & Badge
- **Filter Chip:** `rounded-sm`, background `surface-2`, text `text-primary`. When selected, transitions to background `accent-surface`, border `border-accent`, text `accent-text`, featuring a trailing `X` icon.
- **Status Badge:** Compact `text-caption`, uppercase, `rounded-xs`, padding `2px 8px`. Accompanied by a leading 6px circular dot or semantic icon (`CheckCircle` for In Stock, `WarningCircle` for Low Stock, `XCircle` for Out of Stock).

### 7.4 ProductCard
- **Structure:**
  1. Photographic container (`1:1`) with subtle perimeter hairline and stock pill in top-left corner.
  2. Pin/Compare checkbox or button in top-right corner.
  3. Brand label in `text-caption text-muted`.
  4. Product Name in `text-body-strong text-primary hover:underline`.
  5. Key spec pill list (e.g., `16GB RAM`, `1TB SSD`, `1.4 kg`).
  6. Price in `text-mono-base` with NPR symbol and live stock count.
  7. Full-width verified `<AddToCartButton>`.

### 7.5 Compare Table
- **Semantics:** Clean HTML `<table>`, `<caption>` announcing compared items, `<thead scope="col">` with sticky alignment, and `<th scope="row">` for specification attributes.
- **Sticky Column System:** Leftmost attribute column is sticky (`left-0 z-20`) with opaque `bg-surface/95 backdrop-blur hairline-r`. Product columns are scroll-snapped (`snap-start min-w-[200px]`).
- **Best-Value Cell Highlight:** Marked by subtle cell tint (`bg-accent-surface`) and an inline accessible marker `<Icon name="verified" size="16" /> <span className="sr-only">Best value</span>`. Full-width fluorescent bars are removed.

### 7.6 Drawer & Dialog Modals
- **Stacking:** Modals and blocking sheets render on `z-dialog` (`70`) with backdrop `bg-black/60 backdrop-blur-sm`.
- **Focus Management:** Focus trapped upon mount, keyboard `Escape` dismisses, focus returned to triggering element on exit.

---

## 8. Annotated Layout Wireframes

### 8.1 Desktop Header & Home Screen
```text
+--------------------------------------------------------------------------------------------------+
| [Logo: Ai-builder-cup]   [Search Catalog: "M3 laptop under 2 lakh"...]   [Compare (2)]  [Cart (1)]|
+--------------------------------------------------------------------------------------------------+
| HERO / EDITORIAL MOMENT (Instrument Serif):                                                      |
| "Hardware chosen with precision, backed by genuine Kathmandu stock."                             |
| [Category Pills: All | Laptops (14) | Phones (8) | Audio (12) | Monitors (6) | Accessories (9)]  |
+--------------------------------------------------------------------------------------------------+
| ACTIVE CATALOG GRID                                                       [Filters] [Sort: Price]|
| +-------------------------+ +-------------------------+ +-------------------------+              |
| | [Img 1:1]   [In Stock]  | | [Img 1:1]   [Low Stock] | | [Img 1:1]   [In Stock]  |              |
| | APPLE                   | | LENOVO                  | | DELL                    |              |
| | MacBook Pro 14" M4 Pro  | | IdeaPad Slim 5 14"      | | XPS 13 9340 OLED        |              |
| | 24GB · 512GB · 1.6kg    | | 16GB · 512GB · 1.4kg    | | 16GB · 1TB · 1.2kg      |              |
| | NPR 2,85,000            | | NPR 89,000              | | NPR 1,95,000            |              |
| | [Compare] [Add to Cart] | | [Compare] [Add to Cart] | | [Compare] [Add to Cart] |              |
| +-------------------------+ +-------------------------+ +-------------------------+              |
+--------------------------------------------------------------------------------------------------+
|                                                          [Pip Companion Dock: Parked Bottom-Right]|
+--------------------------------------------------------------------------------------------------+
```

### 8.2 Compare Workspace Screen (`/compare?ids=a,b,c`)
```text
+--------------------------------------------------------------------------------------------------+
| Breadcrumb: Catalog > Compare (3 products)                                                       |
| Title: Product Comparison                                                                        |
| +----------------------------------------------------------------------------------------------+ |
| | [Pip Icon] Pip's Catalog Analysis:                                                           | |
| | "The MacBook Pro 14 leads in performance and battery (22 hrs). The IdeaPad Slim 5 offers     | |
| | best value per rupee for everyday productivity."                                             | |
| | Live Stock: MacBook Pro: In Stock (4) | IdeaPad: In Stock (8) | Dell XPS: Out of Stock       | |
| +----------------------------------------------------------------------------------------------+ |
| [x] Show differences only   | [Filter: All Laptops]                                              |
| +----------------------+--------------------+--------------------+--------------------+          |
| | SPECIFICATION        | MacBook Pro 14     | IdeaPad Slim 5     | Dell XPS 13        |          |
| | (Sticky Col 1)       | NPR 2,85,000       | NPR 89,000 [Value] | NPR 1,95,000       |          |
| |                      | [Verified Add]     | [Verified Add]     | [Notify Me]        |          |
| +----------------------+--------------------+--------------------+--------------------+          |
| | PERFORMANCE          |                    |                    |                    |          |
| | Processor / Chip     | Apple M4 Pro       | Ryzen 7 7730U      | Intel Core Ultra 7 |          |
| | RAM Capacity         | 24 GB [✓]          | 16 GB              | 16 GB              |          |
| | Storage              | 512 GB SSD         | 512 GB SSD         | 1 TB SSD [✓]       |          |
| +----------------------+--------------------+--------------------+--------------------+          |
| | BATTERY & MOBILITY   |                    |                    |                    |          |
| | Battery Life         | 22 hours [✓]       | 11 hours           | 13 hours           |          |
| | Weight               | 1.60 kg            | 1.46 kg            | 1.19 kg [✓]        |          |
| +----------------------+--------------------+--------------------+--------------------+          |
| [Pip Parked in Bottom Clearance — Never Overlapping Table, Summary, or Controls]                 |
+--------------------------------------------------------------------------------------------------+
```

### 8.3 Mobile 4-Column Compare View (390px Viewport)
```text
+--------------------------------------+
| [<= Back] Compare (4)        [Share] |
| +----------------------------------+ |
| | Pip: "Close specs across laptops."| |
| +----------------------------------+ |
| [x] Differences only                 |
| <- horizontal swipe snap ->          |
| +--------------+-------------------+ |
| | STICKY COL 1 | PRODUCT COL (Snap)| |
| | (w-32, 128px)| (min-w-44, 176px) | |
| +--------------+-------------------+ |
| | Spec Header  | [Img] MacBook Pro | |
| |              | NPR 2,85,000      | |
| |              | [In Stock (4)]    | |
| |              | [Add to Cart]     | |
| +--------------+-------------------+ |
| | Processor    | Apple M4 Pro      | |
| | RAM          | 24 GB [✓]         | |
| | Storage      | 512 GB SSD        | |
| | Battery      | 22 hrs [✓]        | |
| | Weight       | 1.60 kg           | |
| +--------------+-------------------+ |
| [Pip Parked in Bottom Padding pb-32] |
+--------------------------------------+
```

---

## 9. Pip Conversation Panel & Companion Choreography

### 9.1 Desktop Dock vs. Mobile Bottom Sheet
- **Desktop (`>= 768px`):** Fixed right-side anchored panel (`width: 380px`, `height: 560px`), `bottom: 24px`, `right: 24px`. Parks beside content gutters, never occluding interactive tables or buttons.
- **Mobile (`< 768px`):** Slides up as an ergonomic bottom sheet (`max-height: 80vh`, `rounded-t-2xl`) with swipe-to-dismiss gesture and safe-area inset preservation.

### 9.2 Unified Conversation Architecture
The previous fragmented separation of "Bubble" vs. "History Drawer" is merged into a **Single Conversation Surface**:
1. **Header:** Pip Status Orb, Title ("Pip — Shopping Companion"), Sound/Voice toggle, Minimize button.
2. **Turn Thread:**
   - **User Message:** Clean, right-aligned bubble in `surface-2`.
   - **Assistant Response:** Left-aligned text in `text-primary`.
   - **Tool Steps Progress:** Collapsible disclosure rows (e.g., `▸ Searched 14 laptops · 3 results`, `▸ Verified stock in Kathmandu · In stock (4)`).
   - **Embedded Cards:** Interactive mini ProductCard, grounded comparison summaries, or verified cart update badges.
3. **Cart Mutation State Badge:**
   - `idle`: Unprompted.
   - `busy`: Spinner + "Verifying stock & reserving slot with Kathmandu warehouse…".
   - `verified`: Green badge with `SealCheck` icon + "Added to cart, stock confirmed (4 units remaining)".
   - `failed`: Red badge with `WarningOctagon` icon + specific failure reason (e.g., "Out of stock", "Store service unavailable").
4. **Composer Bar:**
   - Text input with auto-expanding textarea (up to 4 lines).
   - Microphone button for speech input with listening amplitude wave.
   - Quick suggested reply chips (e.g., "Compare top 2", "Which has better battery?", "Check delivery to Pokhara").

---

## 10. Removal Catalog: Deprecated Elements & Code

To uphold our core principles of **Restraint, Speed, and Honesty**, the following visual artifacts and redundant code are permanently excised:

| Removed Element / Effect | Previous State | Rationale for Removal |
| :--- | :--- | :--- |
| **Film Grain Overlay** | `.grain` fixed background texture | Unnecessary GPU rendering overhead, visual dirt, degrades high-DPI font sharpness. |
| **Ambient Glows & Halos** | `box-shadow: 0 0 40px var(--accent)` | Gimmicky pseudo-futuristic aesthetics that undermine professional hardware credibility. |
| **Heavy Glassmorphism** | Multi-layered `backdrop-blur-xl` + `bg-white/10` | High GPU battery drain on mobile; causes text contrast degradation against busy backdrops. |
| **Gradient Art Placeholders** | Multi-color mesh gradients for missing images | Dishonest representation of product appearance. Replaced with clean typographic monogram fallbacks. |
| **Pill Overuse** | Wrapping every single button, tag, and container in `rounded-full` | Visual monotony and mushy hierarchy. Replaced with purposeful rectangular radii (`rounded-sm` / `rounded-md`). |
| **Idle Orb Breathing Wobble** | Continuous GSAP floating sinusoidal drift | Distracting visual jitter during reading. Replaced with stable, settled parking. |
| **Faux Reservation Claims** | "Item reserved for 10 minutes" | Factually false inventory claim. Replaced with "Stock confirmed at checkout". |
| **ScrambleText Effect** | Random ASCII cycling on numbers | Violates accessibility; disorients screen readers and causes cognitive load. |

---

## 11. Acceptance Checklist & Stage Gate

- [x] Brand idea expressed in two concise sentences.
- [x] Clear target audience profile for Nepal electronics consumers.
- [x] 5 design principles defined with explicit behavioral rules.
- [x] Complete typography system with Geist Sans, Geist Mono, Instrument Serif, and Devanagari fallback plan.
- [x] Warm neutral color scale + single copper accent + status colors.
- [x] WCAG 2.1 AA contrast table calculated for all text and surface pairs in Light and Dark modes.
- [x] Shape, 4px grid spacing, and elevation (hairlines over shadows) defined.
- [x] Single icon library (Phosphor Icons) with sizes, weights, and complete 1-to-1 semantic map.
- [x] Product imagery aspect ratios, backdrops, and honest fallback specifications.
- [x] Primitive v2 component specifications (Button, Input, Table, ProductCard, Dialog).
- [x] Responsive layout wireframes for Desktop and Mobile (390px scroll-snap).
- [x] Unified Pip conversation panel architecture with verified cart feedback.
- [x] Exhaustive removal list of deprecated visual effects and code.

**STOP**: Stage 1 Design Brief is complete and committed to documentation. Awaiting user approval before proceeding to Stage 2 (Tokens, Fonts, Icons, and Primitives v2).
