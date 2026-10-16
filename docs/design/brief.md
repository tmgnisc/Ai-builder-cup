# Design Brief & System Specification: tmgnisc / Ai-builder-cup

**Version:** 2.1.0  
**Status:** Stage 1 Deliverable — Amended per Design Review  
**Target:** Engineering, Product, and Design teams  

---

## 1. Brand Identity, Audience & Principles

### 1.1 Brand Statement (Two Plain Sentences, No Superlatives)
> **Persona is an electronics catalog and shopping companion built for shoppers in Nepal. It presents product specifications in Nepalese Rupees and verifies cart changes against backend inventory before checkout.**

### 1.2 Target Audience
- **Primary Audience:** Electronics shoppers, students, developers, and tech buyers in Nepal (Kathmandu, Pokhara, Lalitpur, Bhaktapur, and outside Valley hubs).
- **Core Buyer Needs:**
  - Clear hardware specifications without promotional noise.
  - Transparent pricing in Nepalese Rupees (NPR) with standard Lakh notation where natural.
  - Realistic delivery estimates (Kathmandu Valley vs. Outside Valley).
  - Reliable inventory confirmation so an order is not canceled after purchase.

### 1.3 Implementation Status vs. Target Goals
To maintain factual honesty, the system distinguishes between current implementation and future roadmap goals:
- **Product Inventory:** Currently backed by an in-memory / database catalog with simulated stock counts and deterministic chaos failure modes. *Goal:* Live synchronization with Kathmandu warehouse management systems (WMS).
- **Warranties:** Currently displays catalog spec fields. *Goal:* Official manufacturer warranty verification with authorized Nepal distributors.
- **Payment Methods:** Currently provides demo checkout handoff. *Goal:* Native integration with Fonepay, Esewa, Khalti, and Cash on Delivery (COD) services.

### 1.4 Five Core Design Principles
1. **Clarity:** Visual hierarchy is immediate. Specifications are structured into standard, comparable tables. Typography guides the eye directly to critical hardware metrics without distracting decoration.
2. **Honesty:** Out-of-stock items, missing specifications, and hardware trade-offs are presented plainly. The system never claims inventory is "reserved" before payment, never inflates discounts, and openly flags when an alternative is a more balanced pick.
3. **Restraint:** We eliminate visual noise—no ambient glows, no skeuomorphic glass reflections, no faux-futuristic grain overlays, and no pill button proliferation. Elements exist only when they serve comprehension or action.
4. **Speed:** UI renders instantaneously. Layout shifts (CLS) are zero. Interactions respond in under 100ms. Mobile ergonomics prioritize thumb reach, stable sticky column headers, and seamless horizontal scroll snapping without page-level overflow.
5. **Trust:** Every agent claim links to concrete catalog specs or inventory endpoints. Cart mutations are verified against backend state. Accessibility (WCAG 2.1 AA) and predictable keyboard focus order ensure reliability for every user.

---

## 2. Typography: Single Font Mandate & Devanagari Fallback

### 2.1 Single Font Mandate
To maintain typographic cohesion and eliminate visual discord, **a single font family (Inter)** is used exclusively across the entire system:
- **Unified Font Family:** All typographic tokens (`font-sans`, `font-display`, `font-mono`) map to the single font family (`Inter`).
- **Data, Metrics & Prices:** Standard `font-mono` and tabular numerals are achieved by applying `font-variant-numeric: tabular-nums` (`tnum`) on the same unified font family, ensuring numbers align cleanly in columns while preserving unified letterforms.
- **Editorial & Section Titles:** Rather than introducing secondary serif or display typefaces, editorial prominence is achieved through scale, optical tracking, and font weight (`font-semibold` / `font-bold`), maintaining architectural restraint.

### 2.2 Type Scale & Hierarchy

| Token | Family | Size / Leading | Weight | Tracking | Purpose & Usage Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display` | Single Font (Inter) | 48px / 52px (3rem) | 600 | `-0.025em` | Homepage Hero Title, major brand moments |
| `text-h1` | Single Font (Inter) | 36px / 40px (2.25rem) | 600 | `-0.02em` | Page titles (Compare, Category, Product Detail) |
| `text-h2` | Single Font (Inter) | 24px / 28px (1.5rem) | 600 | `-0.015em` | Major section headers, Drawer titles, Sheet titles |
| `text-h3` | Single Font (Inter) | 18px / 24px (1.125rem) | 600 | `-0.01em` | Card titles, spec section headers, summary headlines |
| `text-body` | Single Font (Inter) | 14px / 20px (0.875rem) | 400 | `0` | Standard body copy, descriptions, Pip dialogue, reviews |
| `text-body-strong` | Single Font (Inter) | 14px / 20px (0.875rem) | 500 / 600 | `0` | Table row labels, prominent UI labels, cart item titles |
| `text-small` | Single Font (Inter) | 12px / 16px (0.75rem) | 400 | `0` | Secondary descriptions, timestamps, breadcrumbs |
| `text-caption` | Single Font (Inter) | 11px / 14px (0.6875rem) | 600 | `+0.04em` | Uppercase section badges, attribute overlines, tags |
| `text-mono-base` | Single Font (`tnum`) | 14px / 20px (0.875rem) | 500 | `tnum` | Table data values, prices in cards, memory sizes |
| `text-mono-sm` | Single Font (`tnum`) | 12px / 16px (0.75rem) | 400 / 500 | `tnum` | Compact specs, stock counts, delivery day metrics |
| `text-mono-lg` | Single Font (`tnum`) | 20px / 24px (1.25rem) | 600 | `tnum` | Prominent price tags on Product Detail and Cart total |

### 2.3 Devanagari Fallback Plan
While the primary catalog and interface use English for international technical standard terms (RAM, GPU, Thunderbolt), bilingual support and Nepali locale rendering require a robust Devanagari typographic fallback:
- **Fallback Stack:** `Inter, "Noto Sans Devanagari", "Kohinoor Devanagari", system-ui, -apple-system, sans-serif`.
- **Metrics Normalization:** Noto Sans Devanagari matches Inter in x-height and ascender/descender ratios when set to `size-adjust: 104%` in `@font-face`.
- **Tabular Numerals:** Devanagari numerals (`० १२३४५६७८९`) fallback with tabular metric feature tags enabled (`font-feature-settings: "tnum" 1`).

---

## 3. Color System & Script-Verified Contrast

### 3.1 Color Palette Architecture
- **Default Mode:** Clean, warm neutral **Light** theme (`#FBFBFA`).
- **Supported Mode:** Deep, low-fatigue **Dark** theme (`#121211`).
- **Darkened Light Accent & Warning:** To strictly satisfy the WCAG AA 4.5:1 text requirement, the light accent is darkened to `#AF4404` and warning to `#8A4C00`.
- **Dark Theme Accent Button Text:** The dark-theme accent button (`#E06D2B`) uses dark text (`#121211`) achieving a **5.71:1** contrast ratio.

### 3.2 Automated WCAG 2.1 Contrast Verification Table
Generated directly by `scripts/check_contrast.ts` and validated in CI:

| Color Pair | Foreground | Background | Ratio | Requirement | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Light: text on bg | `#181716` | `#FBFBFA` | **17.29 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: text on surface | `#181716` | `#FFFFFF` | **17.90 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: muted on bg | `#64625C` | `#FBFBFA` | **5.89 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: muted on surface | `#64625C` | `#FFFFFF` | **6.10 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: muted on surface2 | `#64625C` | `#F3F2EE` | **5.44 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: darkened accent on bg | `#AF4404` | `#FBFBFA` | **5.55 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: white text on darkened accent button | `#FFFFFF` | `#AF4404` | **5.75 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: darkened warning on bg | `#8A4C00` | `#FBFBFA` | **6.51 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: success on bg | `#1A6E2E` | `#FBFBFA` | **6.12 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: danger on bg | `#B31B18` | `#FBFBFA` | **6.57 : 1** | 4.5:1 (AA) | ✓ PASS |
| Light: border on bg (UI) | `#8F8C84` | `#FBFBFA` | **3.24 : 1** | 3:1 (Component) | ✓ PASS |
| Dark: text on bg | `#F5F4F0` | `#121211` | **17.03 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: text on surface | `#F5F4F0` | `#1A1918` | **15.95 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: muted on bg | `#A29F96` | `#121211` | **7.08 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: muted on surface | `#A29F96` | `#1A1918` | **6.63 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: muted on surface2 | `#A29F96` | `#242321` | **5.93 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: accent on bg | `#F59E6C` | `#121211` | **8.92 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: dark text on accent button | `#121211` | `#E06D2B` | **5.71 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: warning on bg | `#F5A623` | `#121211` | **9.25 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: success on bg | `#34C759` | `#121211` | **8.44 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: danger on bg | `#FF453A` | `#121211` | **5.50 : 1** | 4.5:1 (AA) | ✓ PASS |
| Dark: border on bg (UI) | `#64615B` | `#121211` | **3.04 : 1** | 3:1 (Component) | ✓ PASS |

---

## 4. Shape, Spacing, Elevation & Motion

### 4.1 Shape & Radii Hierarchy
- `rounded-none` (`0px`): Full-width banners, table cells.
- `rounded-xs` (`4px`): Badges, tooltips, inline `kbd` tags.
- `rounded-sm` (`6px`): Small buttons (`size="sm"`), filter chips.
- `rounded-md` (`8px`): Standard buttons (`size="md"`), input fields.
- `rounded-lg` (`12px`): Product cards, spec group boxes, toast alerts.
- `rounded-xl` (`16px`): Dialog modals, Compare workspace table surface.
- `rounded-full` (`9999px`): Status dots, circular icon buttons.

### 4.2 Spacing Scale (4px Base Grid)
Tokens: `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-5` (20px), `space-6` (24px), `space-8` (32px), `space-10` (40px), `space-12` (48px), `space-16` (64px).

### 4.3 Elevation & Z-Index Scale
Hairlines (`1px` borders in `border-subtle` and `border-strong`) replace heavy shadows.

| Layer Token | Utility Class | Value | Purpose & Stacking Order |
|---|---|---|---|
| `base` | `z-base` | `0` | Default document grid, cards, background. |
| `dock` | `z-dock` | `10` | Bottom docking areas. |
| `elevated` | `z-elevated` | `20` | Card hover states, floating compare tray. |
| `sticky` | `z-sticky` | `30` | Navigation header, sticky table columns/headers. |
| `spotlight` | `z-spotlight` | `35` | Element highlight ring. Sits on content, below overlays. |
| `drawer` | `z-drawer` | `40` | Side drawers (cart, history, filters). |
| `modal` | `z-modal` | `50` | Full-screen modal backdrops and dialog scrims. |
| `orb` | `z-orb` | `55` | Pip Three.js canvas. Stacks above drawers and modals. |
| `popover` | `z-popover` | `60` | Dropdown menus, Pip's ⋯ action menu. |
| `bubble` | `z-bubble` | `65` | Pip's speech bubble and tour tips. Always above orb. |
| `dialog` | `z-dialog` | `70` | Blocking confirmation dialogs requiring user input. |
| `tooltip` | `z-tooltip` | `75` | Micro-help hover and focus tooltips. |
| `toast` | `z-toast` | `80` | Transient system notifications. |

### 4.4 Pip Dock: Overlay Architecture & 1280px Laptop Behavior
- **Overlay Architecture (No Page Reflow):**
  - Pip and its conversation dock render as a fixed overlay (`z-orb: 55`, `z-bubble: 65`).
  - **Pip does NOT reflow page content or shift the document grid.** This guarantees zero Cumulative Layout Shift (CLS = 0).
- **Behavior on a 1280px Laptop Viewport:**
  - On a 1280px screen, `max-w-7xl` content (1280px) occupies the full screen width with `px-4 sm:px-6 lg:px-8` padding.
  - To prevent Pip from ever occluding interactive cards or buttons on 1280px displays:
    1. **Bottom Clearance Zone:** All main page containers declare bottom clearance padding (`pb-32 sm:pb-24`).
    2. **Parked Resting Point:** Pip parks at `bottom-4 right-4` (`window.innerWidth - MARGIN - size/2`, `window.innerHeight - MARGIN - size/2`).
    3. **Scroll Clearance:** As the user scrolls, all table rows, cards, and buttons scroll completely above Pip's resting zone.
    4. **Smart Bubble Avoidance:** When Pip speaks, the speech bubble calculates the bounding box of the active anchor element and flips `top` (above the card) or `bottom` (below the card) if lateral space is insufficient.

---

## 5. Icon System: Phosphor Icons Specification

- **Single Family:** Exclusively `@phosphor-icons/react` (MIT). No second library or icon fonts.
- **Sizes:** `16px` (`sm`), `20px` (`md`), `24px` (`lg`), `32px` (`xl`).
- **Weights:** `regular` (default UI), `bold` (small badges), `fill` (selected/active states), `duotone` (empty states only).
- **Encapsulation:** Accessed solely through `src/components/ui/Icon.tsx`.
- **Accessibility:** Icon-only buttons require an accessible `aria-label`; decorative icons have `aria-hidden="true"`.
- **No Emoji in UI:** All emojis are prohibited from UI controls and system messages.

---

## 6. Imagery Rules & Honest Fallbacks

- **Aspect Ratios:** Product cards (`1:1` square), table headers (`4:3` horizontal), hero editorial (`16:9` widescreen).
- **Backdrops:** Neutral photographic surfaces (warm off-white in light theme, deep slate in dark theme).
- **Honest Fallbacks (No Fake Art):**
  - When a product photo is absent, the UI renders a crisp architectural monogram card with the **Brand Name + Category Outline Glyph**, accompanied by SKU and category title.
  - No generic stock photography, no AI-generated fake renders, no multi-color gradient art.

---

## 7. Component Specifications (v2 Primitives)

- **Button:**
  - `primary`: Background `accent` (`#AF4404` light / `#E06D2B` dark), text `white` (light) / `#121211` (dark).
  - `secondary`: Background `surface-1`, hairline border `border-strong`, text `text-primary`.
  - `ghost`: Transparent background, hover `surface-2`.
  - `destructive`: Hairline border `status-danger`, text `status-danger`.
  - States: `idle`, `hover`, `active` (scale 0.98), `focus-visible` (2px focus ring), `busy` ("Verifying…"), `disabled` (`opacity-50`).
- **IconButton:** 36px/40px touch targets, requires `aria-label`, centers single icon token.
- **Input:** 40px height, `rounded-md`, border `border-strong`, focus `ring-1 ring-accent`.
- **StockBadge:**
  - `In stock (>5)`: Green badge with `CheckCircle` icon + exact unit count (`In stock (12 units)`).
  - `Low stock (1–5)`: Amber badge with `WarningCircle` icon + remaining count (`Only 3 left`).
  - `Out of stock`: Crimson badge with `XCircle` icon + `"Out of stock"`.
- **Compare Winner Badge:** Labeled strictly **"Best on specs"** (grounded in catalog metrics, avoiding subjective marketing claims).
- **Disabled Add to Cart:** Always states explicit reason on hover or focus (e.g., `"Out of stock"`).

---

## 8. Annotated Layout Wireframes (Desktop & Mobile for All 7 Screens)

### 8.1 Screen 1: Home
#### Desktop (>= 1024px)
```text
+--------------------------------------------------------------------------------------------------+
| [Logo: Ai-builder-cup]   [Search: "laptop under 1.5 lakh"...]      [Theme]   [Compare (2)]  [Cart (1)]|
+--------------------------------------------------------------------------------------------------+
| HERO (Single Font Inter):                                                                        |
| "Hardware chosen with precision, backed by genuine Kathmandu stock."                             |
| [Category Pills: All | Laptops (14) | Phones (8) | Audio (12) | Monitors (6) | Accessories (9)]  |
+--------------------------------------------------------------------------------------------------+
| PRODUCT CATALOG GRID (4 columns)                                          [Filters] [Sort: Price]|
| +-------------------------+ +-------------------------+ +-------------------------+ +------------+ |
| | [Img 1:1]   [In Stock]  | | [Img 1:1]   [Low Stock] | | [Img 1:1]   [In Stock]  | | [Img 1:1]  | |
| | APPLE                   | | LENOVO                  | | DELL                    | | SONY       | |
| | MacBook Pro 14" M4 Pro  | | IdeaPad Slim 5 14"      | | XPS 13 9340 OLED        | | WH-1000XM5 | |
| | 24GB · 512GB · 1.6kg    | | 16GB · 512GB · 1.4kg    | | 16GB · 1TB · 1.2kg      | | 30h · ANC  | |
| | NPR 2,85,000            | | NPR 89,000              | | NPR 1,95,000            | | NPR 49,500 | |
| | [Compare] [Add to Cart] | | [Compare] [Add to Cart] | | [Compare] [Add to Cart] | | [Compare]  | |
| +-------------------------+ +-------------------------+ +-------------------------+ +------------+ |
+--------------------------------------------------------------------------------------------------+
| [Pip Parked Bottom-Right (Clearance Area pb-32)]                                                 |
+--------------------------------------------------------------------------------------------------+
```
#### Mobile (390px)
```text
+--------------------------------------+
| [Menu]  Ai-builder-cup    [Cart (1)] |
| [Search catalog...]                  |
| [Pills: All | Laptops | Phones]      |
| +----------------------------------+ |
| | [Img 1:1]                        | |
| | Apple MacBook Pro 14" M4 Pro     | |
| | NPR 2,85,000 · In Stock (4)      | |
| | [Compare] [Add to Cart]          | |
| +----------------------------------+ |
| [Pip docked bottom-right in pb-32]  |
+--------------------------------------+
```

### 8.2 Screen 2: Category Listing & Filters
#### Desktop (>= 1024px)
```text
+--------------------------------------------------------------------------------------------------+
| Breadcrumb: Catalog > Laptops (14 products)                                                      |
| Heading: Laptops for Work & Development                                                          |
| +-----------------------+ +--------------------------------------------------------------------+ |
| | FILTERS               | | CATALOG GRID (3 columns)                             [Sort: Price] | |
| | Price Range (NPR)     | | +-----------------------+ +-----------------------+ +--------------+ | |
| | [min] to [max]        | | | IdeaPad Slim 5        | | MacBook Pro 14        | | Dell XPS 13  | | |
| | RAM (8GB, 16GB, 24GB) | | | NPR 89,000            | | NPR 2,85,000          | | NPR 1,95,000 | | |
| | Battery Life (>=10h)  | | | [Compare] [Add]       | | [Compare] [Add]       | | [Compare] [Add]| |
| | In Stock Only [x]     | | +-----------------------+ +-----------------------+ +--------------+ | |
| +-----------------------+ +--------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```
#### Mobile (390px)
```text
+--------------------------------------+
| [<= Back] Laptops (14)     [Filter ☰]|
| [Sort: Price: Low to High ▼]         |
| +----------------------------------+ |
| | [Img 1:1] Lenovo IdeaPad Slim 5  | |
| | NPR 89,000 · In stock (8)        | |
| | [Compare] [Add to Cart]          | |
| +----------------------------------+ |
| [Filters Drawer slides as Sheet]    |
+--------------------------------------+
```

### 8.3 Screen 3: Product Detail
#### Desktop (>= 1024px)
```text
+--------------------------------------------------------------------------------------------------+
| Breadcrumb: Catalog > Laptops > Apple MacBook Pro 14" M4 Pro                                     |
| +------------------------------------+ +-------------------------------------------------------+ |
| | PRODUCT GALLERY (1:1 Photographic) | | Apple MacBook Pro 14" M4 Pro (2024)                   | |
| |                                    | | In Stock (4 units) · Valley delivery: 1–2 days        | |
| |                                    | | NPR 2,85,000                                          | |
| |                                    | | [Add to Cart (Verified)]  [Add to Compare]            | |
| |                                    | |-------------------------------------------------------| |
| |                                    | | HARDWARE SPECIFICATIONS                               | |
| |                                    | | Processor: Apple M4 Pro (12-core CPU, 16-core GPU)    | |
| |                                    | | Memory: 24 GB Unified Memory                          | |
| |                                    | | Storage: 512 GB NVMe SSD                              | |
| |                                    | | Battery: 22 hours wireless web                        | |
| |                                    | | Weight: 1.60 kg                                       | |
| +------------------------------------+ +-------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```
#### Mobile (390px)
```text
+--------------------------------------+
| [<= Back]                    [Cart 1]|
| [Product Image 1:1]                  |
| Apple MacBook Pro 14" M4 Pro         |
| NPR 2,85,000 · In stock (4 units)    |
| [Sticky Bottom Add to Cart Button]   |
| --- Specs Accordion ---              |
| ▸ Performance & Chip                 |
| ▸ Battery & Dimensions               |
+--------------------------------------+
```

### 8.4 Screen 4: Compare Workspace (`/compare?ids=...`)
#### Desktop (>= 1024px)
```text
+--------------------------------------------------------------------------------------------------+
| Breadcrumb: Catalog > Compare (3 products)                                                       |
| Title: Product Comparison                                                                        |
| +----------------------------------------------------------------------------------------------+ |
| | Pip's Catalog Analysis: "MacBook Pro leads in battery (22h). IdeaPad Slim 5 is best value."  | |
| | Live Stock: MacBook Pro (4) | IdeaPad Slim 5 (8) | Dell XPS 13 (Out of stock)                | |
| +----------------------------------------------------------------------------------------------+ |
| [x] Show differences only   | [Filter to Laptops]                                                |
| +--------------------+--------------------+--------------------+-------------------------------+ |
| | SPECIFICATION      | MacBook Pro 14     | IdeaPad Slim 5     | Dell XPS 13                   | |
| | (Sticky Col 1)     | NPR 2,85,000       | NPR 89,000 [Value] | NPR 1,95,000                  | |
| |                    | [Verified Add]     | [Verified Add]     | [Disabled: Out of Stock]      | |
| +--------------------+--------------------+--------------------+-------------------------------+ |
| | Processor          | Apple M4 Pro [✓]   | Ryzen 7 7730U      | Intel Core Ultra 7            | |
| | RAM Capacity       | 24 GB [✓]          | 16 GB              | 16 GB                         | |
| | Battery Life       | 22 hours [✓]       | 11 hours           | 13 hours                      | |
| | Weight             | 1.60 kg            | 1.46 kg            | 1.19 kg [✓]                   | |
| +--------------------+--------------------+--------------------+-------------------------------+ |
| [Pip Parked Bottom-Right (Clearance Area pb-32)]                                                 |
+--------------------------------------------------------------------------------------------------+
```
#### Mobile (390px — Scroll-Snap First Column Readable)
```text
+--------------------------------------+
| [<= Back] Compare (4)        [Share] |
| Pip: "MacBook leads battery (22h)."  |
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
| | Processor    | Apple M4 Pro [✓]  | |
| | RAM          | 24 GB [✓]         | |
| | Battery      | 22 hrs [✓]        | |
| +--------------+-------------------+ |
+--------------------------------------+
```

### 8.5 Screen 5: Cart & Drawer
#### Desktop & Mobile Drawer
```text
+-----------------------------------------------------+
| Shopping Cart (2 items)                          [X]|
| +-------------------------------------------------+ |
| | [Img] IdeaPad Slim 5 14"                        | |
| | NPR 89,000 · Qty: [ - 1 + ]       [Remove]     | |
| | Stock confirmed: 8 units available              | |
| +-------------------------------------------------+ |
| | [Img] Sony WH-1000XM5                           | |
| | NPR 49,500 · Qty: [ - 1 + ]       [Remove]     | |
| | Stock confirmed: 5 units available              | |
| +-------------------------------------------------+ |
| Subtotal (2 items): NPR 1,38,500                    |
| Delivery: Free Valley Delivery (1–2 days)           |
| Items stay in cart until checkout; stock confirmed. |
| [Proceed to Checkout Button]                        |
+-----------------------------------------------------+
```

### 8.6 Screen 6: Checkout Confirmation
#### Desktop & Mobile
```text
+--------------------------------------------------------------------------------------------------+
| Order Confirmation & Delivery Details                                                            |
| +-------------------------------------------------------+ +------------------------------------+ |
| | 1. Delivery Address                                   | | ORDER SUMMARY                      | |
| | Full Name: Sudip Sharma                               | | 2 items · Subtotal: NPR 1,38,500   | |
| | Phone: 9841XXXXXX                                     | | Delivery: NPR 0 (Kathmandu Valley) | |
| | City: Kathmandu Valley (Bagmati)                      | | Total: NPR 1,38,500                | |
| | Estimated Delivery: 1–2 business days                 | |                                    | |
| |                                                       | | Planned Payment Integrations:      | |
| | 2. Payment Method (Demo Mode)                         | | • Cash on Delivery (COD)           | |
| | (•) Simulated Store Checkout                          | | • Fonepay / Esewa / Khalti         | |
| | [Confirm & Complete Order]                            | |                                    | |
+--------------------------------------------------------------------------------------------------+
```

### 8.7 Screen 7: Merchant Dashboard
#### Desktop & Mobile
```text
+--------------------------------------------------------------------------------------------------+
| Merchant Portal: Shopper Telemetry & Search Gaps                                                 |
| +-----------------------+ +-----------------------+ +------------------+ +---------------------+ |
| | Assisted Sessions     | | Task Completion Rate  | | Verified Actions | | Catalog Spec Gaps   | |
| | 128 sessions (+14%)   | | 84.2% (+3.1%)         | | 98.6% verified   | | 7 missing fields    | |
| +-----------------------+ +-----------------------+ +------------------+ +---------------------+ |
| +----------------------------------------------------------------------------------------------+ |
| | SHOPPER SPECIFICATION GAPS (Telemetric missing_info events)                                  | |
| | • Apple MacBook Pro 14: "RAM upgradeability" (Requested 4 times)                             | |
| | • Sony WH-1000XM5: "Water resistance rating" (Requested 3 times)                             | |
| | • Lenovo IdeaPad Slim 5: "Display brightness nits" (Requested 2 times)                       | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

---

## 9. Pip Conversation Panel & Companion Architecture

- **Unified Thread:** Eliminates fragmented Bubble/History split.
- **Message Types:** User query, Assistant reply, Tool steps disclosure, Compact Product Card, Cart mutation status.
- **Verified Cart Feedback:** Transitions from `busy` ("Verifying…") to `verified` ("Added & verified ✓") or `failed` ("Failed: Out of stock").

---

## 10. Deprecated Elements Permanent Removal List

- Film Grain Overlay (`.grain`)
- Ambient Glows & Drop-Shadow Halos
- Heavy Glassmorphism
- Gradient Art Placeholders
- Pill Overuse
- Idle Sinusoidal Wobble
- ScrambleText Effect
- Faux Reservation Claims
