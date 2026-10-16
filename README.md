# Persona: AI shopping companion (frontend MVP)

An electronics store with **Pip**, an animated companion that searches, compares and adds to cart, with every agent step visible.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest: 122 tests (parser, catalog, cart, agent, guide engine, check-ins, merchant data)
pnpm lint && pnpm typecheck && pnpm build
```

For demos, use `pnpm build && pnpm start`: the in-memory cart lives in a single server process.

## Mock commerce API

| Route | Notes |
|---|---|
| `GET /api/products?q=&category=&brand=&minPrice=&maxPrice=&minRam=&minBattery=&maxWeight=&tag=&inStock=1&sort=&limit=` | catalog search |
| `GET /api/products/:id` | single product |
| `GET/POST/PATCH/DELETE /api/cart` | session cart (cookie `persona_sid`) |

**Latency and failures.** Requests take 200–600 ms by default, and the failure rate is **0%**. Out-of-stock errors are always deterministic.

- Add `?chaos=0.1` to any page URL to enable a 10% failure rate for the browser session. Half of the failures return a 503; the other half are *silent*: the request reports success but nothing is saved, which only verify-after-act catches.
- Add `?latency=0` to an API URL to disable latency.
- Env overrides: `PERSONA_FAILURE_RATE`, `PERSONA_LATENCY_MIN_MS`, `PERSONA_LATENCY_MAX_MS`.

## Compare workspace (`/compare`)

A dedicated side-by-side comparison workspace at `/compare?ids=a,b[,c,d]`:

- **Shareable and refresh-safe**: URL query params are the single source of truth for the comparison selection.
- **2 to 4 products**: Supports up to 4 products across TS and Python backend registries.
- **Pip integration**: Ask Pip to add or remove products from comparison by voice or chat (`Add HP Pavilion to compare`, `Remove Acer Swift`), updating the URL reactively.
- **Strict semantics**: Full table markup (`<table>`, `<caption>`, `<thead>`, `<tbody>`, `<th scope="col">`, `<th scope="row">`, `<th scope="colgroup">`).
- **Sticky headers**: Header cards stay anchored while scrolling, showing the product image, title, price, single-line stock badge, verified Add to cart, and remove button.
- **Mobile 4-column experience**: At 390px, sticky attribute name column on the left plus smooth horizontal scroll-snap product columns.
- **Grouped spec sections**: Clear sections for Performance, Battery & Weight, Display, Connectivity, and Warranty.
- **Differences-only toggle**: Accessible switch that hides matching rows with `aria-live="polite"` feedback for screen readers.
- **Best-value highlights**: Subtle cell backgrounds with check icons and visually hidden `(best value)` text.
- **Verified Cart Add**: Uses `addWithFeedback` with inline verification state (`idle` → `busy` → `verified ✓` / `failed ✕`) and `aria-live` announcements.
- **Catalog-grounded missing info**: Any missing specs automatically emit `missing_info` events to the merchant dashboard.
- **Cross-category guards**: Warning banner when comparing products from different categories with a one-click dominant category filter.
- **Clamped companion layering**: Pip's flight controller guarantees the orb never obscures comparison tables, summary panels, or action controls on desktop or mobile.
- **CompareDrawer preview**: Compact bottom drawer preview on store pages that shares identical compare rules and links directly to the `/compare` workspace.

## Agent

`POST /api/agent` streams newline-delimited JSON `AgentEvent`s (see `src/lib/agent/types.ts`). The server is stateless: the client sends `{ message, memory, context }` each turn.

- `runAgent.ts`: the runtime. It validates every tool call with zod, traces it, and **enforces verify-after-act**: after `add_to_cart`/`remove_from_cart` it always calls `get_cart` and reports whether the change is really there.
- `mockAgent.ts`: the rule-based agent (understanding lives in `intent.ts`). It retries transient failures once, relaxes filters when nothing matches, and suggests in-budget, in-stock alternatives.
- `geminiAgent.ts`: a stub with the same interface. Set `PERSONA_AGENT=gemini` + `GEMINI_API_KEY` once it's implemented. `toolDeclarations()` already emits JSON schemas.
- There is no checkout tool. Pip can only open `/checkout`, where the user confirms.
- `PERSONA_AGENT_PACE` (default 1) scales the demo pacing; set it to 0 for instant responses.

## Pip, the roaming companion

Pip isn't a chat widget. It lives on the whole screen, flies to whatever is relevant, and talks through a speech bubble.

- **Moving:** `pilot.ts` owns Pip's live position, with five modes:
  - `free`: gentle wander
  - `anchored`: tracks an element through scrolling
  - `follow`: trails the cursor at a distance
  - `parked`: sits in a corner
  - `dragging`

  Flights follow a curved path with `expo.inOut`. Pip looks at where it's going first, stretches along its direction of travel, and squashes when it lands. One small canvas is moved with CSS transforms, so there's no full-screen WebGL.
- **Talking:** one `SpeechBubble` with a tail that points at Pip, on the side with the most room. It holds:
  - streamed text and the last thing you said
  - up to 3 mini product cards with Add buttons
  - cart status (pending → verified ✓ / failed ✕), using the line from `get_cart`
  - chips and a one-line tool trace
  - an inline reply box with a mic

  It dismisses itself after reading time (about 250 ms per word, 4–12 s), unless it has actions or you're hovering it. The full conversation, with every tool step, is in the **History** drawer (header icon or Pip's ⋯ menu).
- **Placement:** `placement.ts` tries right → left → above → below of the target, and never covers the cursor, the focused input, the header or an open drawer. Anchors come from `data-pip-anchor` / `data-pip-topic` attributes via the registry in `anchors.ts`.
- **Agent choreography:** the agent emits `move_to`, `highlight`, `scroll_to`, `set_filters` and `open_drawer`. When Pip presents results, it filters the grid to match and flies to the first card. When comparing, it hovers between the two cards, then above the verdict. When adding, it flies to the product, rides with the item to the cart icon, and only then does the success hop.
- **Guide engine** (`src/lib/guide/`):
  - It speaks up on page arrival, when you've been still for 3 s (5 s on mobile), when you rest on something for 1.5 s, when certain sections scroll into view, and on behaviour (revisits, going back and forth between two products, juggling the price filter, removing an item from the cart).
  - Each element escalates from a one-line tip, to a question with chips, to silence.
  - Guardrails:
    - at least 15 s between tips (6 s after a page intro), and 20 s after you dismiss one
    - never while you're typing, dragging, scrolling or in a modal, and never over an agent reply
    - three dismissals in a row put Pip in quiet mode
  - Every tip number is computed from the catalog (`stats.ts`, `tips.ts`). A first-visit tour has 5 spotlighted stops.
  - **Check-ins:** if you stay still and Pip has nothing left to say about what you're looking at (or you haven't touched the page yet), it asks a page-aware question: *"Anything stopping you from getting the Swift Go 14?"*, with chips such as *Cheaper option*, *When would it arrive?*, *Something's confusing* and *Just looking*. One per page (per product or category) per session. *Something's confusing* asks what's in the way, records the answer for the merchant dashboard, and Pip also answers it.
- **Your controls:**
  - click Pip to talk, drag it to move it, double-click to park it
  - `/` opens Pip's input; hold `V` to talk
  - Pip's ⋯ menu has mute, quiet mode (Pip parks and stops offering tips), pause, follow my cursor, privacy, and reset memory
- **Mobile:** Pip is 64px and stays on the screen edges. The bubble becomes a bottom card, and Pip lifts above it. Idle detection waits 5 s, and there's no hover dwell.
- **Voice:** recognition uses the Web Speech API with `lang=en-IN`; the live transcript becomes Pip's caption, and Pip reacts to mic loudness. Text-to-speech (`speechSynthesis`) reads replies to spoken turns aloud, with word-boundary events driving Pip's speaking pulse.

## Pip playground

`/playground` (dev only; set `NEXT_PUBLIC_PLAYGROUND=1` to include it in a production build) shows Pip on a stage with:

- a button for every state, plus "cycle all"
- reactions (hop, spin, shake), click-to-glance, and simulated mic/TTS envelopes
- leva sliders for every uniform. Turn on *override tween*, tune, then **Copy config** and paste the JSON into `src/components/companion/states.ts`.
- position modes, fly to a random anchor, run the tour, a fake idle trigger, samples of every bubble type, and an overlay showing anchors and placement decisions

Deep links: `/playground?state=thinking`, `/playground?cycle=1`.

## Merchant dashboard

`/merchant` shows how shoppers use Pip. The week is mock data (`src/data/merchant.ts`); the rest is live from your browser session.

- **KPI cards** with 7-day sparklines: assisted sessions, task completion, cart actions verified (412 of 418; Pip reported the other 6 honestly), and tips engaged.
- **Assisted funnel:** talked to Pip → saw recommendations → compared → added to cart (verified) → started checkout, with the biggest drop flagged.
- **Top questions** with intent and resolution rate.
- **Missing product info:** questions Pip couldn't answer from the catalog. Each row is a real product and a field the catalog really lacks (a test checks this).
- **What's getting in the way:** answers to Pip's *Something's confusing* check-in. Your own answers appear at the top, marked *you, just now*.
- **This session, live:** your questions, verified cart actions and feedback so far.

Every section is a Pip anchor, so rest on one and Pip explains it with numbers from the data.

## Performance

Measured with Lighthouse 12 on a production build (`pnpm build && pnpm start`):

| Page (desktop) | Performance | Accessibility | Best practices |
|---|---|---|---|
| `/` | 96–98 | 100 | 100 |
| `/product/acer-swift-go-14` | 99 | 100 | 100 |
| `/merchant` | 96 | 100 | 100 |

Home: LCP 0.8–0.9 s, TBT 100–150 ms, CLS 0.001. Pip's three.js canvas loads in its own chunk after the page has loaded and the main thread is idle; a CSS stand-in shows until then.

Simulated mobile (4× CPU slowdown) scores about 65–70. The shared bundle (React, GSAP, zod, the stores) is about 245 kB of JS that runs before the page can respond. Shrinking that, for example by moving response validation to `zod/mini` and lazy-loading GSAP plugins, is the next step.

**Reduced motion:** with `prefers-reduced-motion`, Pip jumps instead of flying, doesn't wander or bob, there are no fly-to-cart, grid or hero animations, and numbers appear without counting up.

## Build phases

1. ✅ Scaffold, design system, catalog, mock commerce
2. ✅ Pip (three.js orb, eyes, halo, 12 states, `/playground`)
3. ✅ Store UI and GSAP choreography
4. ✅ Agent loop
5. ✅ Voice and signals
6. ✅ Roaming companion: position model, speech bubble, anchors and placement, guide engine and tour, agent choreography, mobile
7. ✅ Merchant dashboard, performance, reduced-motion and light-theme pass, demo script

## Demo script (about 4 minutes)

**Setup:** run `pnpm build && pnpm start` and use Chrome, which has the best Web Speech support. To get the first-visit tour again, open a private window or clear the `persona-tour-v1` key in localStorage. Typing works everywhere voice does: press `/` and type the same sentence.

1. **Meet Pip (20 s).** Open `/`. Pip lands in the hero, says hello and offers a 20-second tour. Click **Yes, show me** and step through 2–3 stops (spotlight + bubble), then **Skip tour**.
2. **Ask by voice (40 s).** Hold `V` and say: *"I need a laptop under 1 lakh 20 thousand for full-stack development, good battery, enough RAM for Docker."* Pip goes listening → thinking → searching, filters the grid to match, flies to the first card and shows 3 mini cards. The trace line shows `search_products`.
3. **Compare workspace (40 s).** Say *"Compare the first two."* Pip opens the dedicated `/compare?ids=...` workspace, showing side-by-side grouped specs (Performance, Battery & Weight, Display, Connectivity, Warranty) with sticky product cards, live stock counts, and grounded catalog analysis. Then ask Pip: *"Add the HP Pavilion to compare."* Pip updates the URL to include all 3 (up to 4 supported), and re-evaluates the verdict without full reload. Flip the **Show differences only** switch to hide identical specs. On mobile (390px), swipe across scroll-snap columns with attribute names pinned on the left; Pip parks cleanly in the safe zone without covering any table cells or controls.
4. **Add with verification (30 s).** Say *"Add the lighter one."* Pip flies to the product, rides with it to the cart icon, re-reads the cart, and only then hops: *"Added & verified ✓"*.
5. **Honest failure (20 s).** Type *"Add the ThinkPad E14."* It's out of stock, so Pip shows the error state, says so plainly and offers an in-stock alternative.
6. **Proactive help (40 s).** Open the **Swift Go 14** page (`/product/acer-swift-go-14`) and rest the mouse on the battery row of the spec table: Pip anchors beside it with a catalog fact (*"10 h, longer than 60% of the laptops here"*). Then keep still. Pip checks in: *"Anything stopping you from getting the Swift Go 14?"* Click **Something's confusing** and type *"Not sure if 16 GB is enough for Docker."*
7. **Merchant view (40 s).** Click **Merchant** in the header. Point out the KPIs, the funnel's biggest drop, and missing product info. Your feedback from step 6 is at the top of *What's getting in the way*, and your questions are in *This session, live*. Rest on the **Cart actions verified** card and Pip explains it.

**Extras if there's time:**
- Add `?chaos=0.3` to the URL and add something to the cart. Some adds fail silently, and verify-after-act catches them (✕ instead of ✓).
- Switch to light theme (sun/moon icon in the header).
- Dismiss three tips in a row, and Pip parks itself and goes quiet.
- Drag Pip anywhere, or double-click it to park it in a corner.

**If something goes wrong:** voice needs microphone permission and Chrome. If it's flaky, type instead (`/`). If Pip seems to be ignoring you, check the ⋯ menu: it may be paused or in quiet mode. *Reset memory* starts the conversation over.
