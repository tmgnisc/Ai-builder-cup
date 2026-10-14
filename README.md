# Persona: AI shopping companion (frontend MVP)

An electronics store with **Pip**, an animated companion that searches, compares and adds to cart, with every agent step visible.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest: budget parser, catalog, cart store
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

## Build phases

1. ✅ Scaffold, design system, catalog, mock commerce
2. ✅ Pip (three.js orb, eyes, halo, 12 states, `/playground`)
3. ✅ Store UI and GSAP choreography
4. ✅ Agent loop
5. ✅ Voice and signals
6. ✅ Roaming companion: position model, speech bubble, anchors and placement, guide engine and tour, agent choreography, mobile
7. Merchant dashboard, performance pass and demo script

## Demo flow

1. On a first visit, Pip lands in the hero, greets you and offers a tour. Say or type "skip".
2. Browse laptops and rest on a card. Pip flies beside it with a real-data tip.
3. Click Pip (or hold V) and say: *"I need a laptop under 1 lakh 20 thousand for full-stack development, good battery, enough RAM for Docker."* Pip searches, filters the grid, flies to the first result, and shows 3 mini cards.
4. Say *"Compare the first two"*. Pip moves between the two cards, then the comparison drawer opens with a grounded verdict.
5. Say *"Add the lighter one"*. Pip flies from the product to the cart icon, verifies the add (✓), and hops.
6. Open a product page, scroll to the specs, and rest on the battery row. Pip anchors beside it with a tip.
7. Dismiss three tips in a row. Pip parks itself and goes quiet.
