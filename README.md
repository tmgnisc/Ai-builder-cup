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

## Pip playground

`/playground` (dev only; set `NEXT_PUBLIC_PLAYGROUND=1` to include it in a production build) shows Pip on a stage with:

- a button for every state, plus "cycle all"
- reactions (hop, spin, shake), click-to-glance, and simulated mic/TTS envelopes
- leva sliders for every uniform. Turn on *override tween*, tune, then **Copy config** and paste the JSON into `src/components/companion/states.ts`.

Deep links: `/playground?state=thinking`, `/playground?cycle=1`.

## Build phases

1. ✅ Scaffold, design system, catalog, mock commerce
2. ✅ Pip (three.js orb, eyes, halo, 12 states, `/playground`)
3. ✅ Store UI and GSAP choreography
4. ✅ Agent loop and chat dock
5. Voice and nudges
6. Merchant dashboard and polish
