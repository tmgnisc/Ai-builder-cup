import { describe, expect, it } from "vitest";
import { evaluate, NUDGE_CONFIG, type EngineInput, type SignalEvent } from "./nudgeEngine";

const T0 = 1_000_000;
const view = (productId: string, at: number): SignalEvent => ({ type: "view", productId, at });
const price = (at: number): SignalEvent => ({ type: "filter", key: "priceRange", at });

function input(events: SignalEvent[], over: Partial<EngineInput> = {}): EngineInput {
  return {
    events,
    now: events.length ? events[events.length - 1].at + 10 : T0,
    firedKeys: [],
    dismissedTypes: [],
    lastNudgeAt: null,
    lastTypingAt: 0,
    paused: false,
    busy: false,
    category: "laptops",
    ...over,
  };
}

const shown = (d: ReturnType<typeof evaluate>) => (d && "show" in d ? d.show : null);

describe("rules", () => {
  it("1. same product viewed 3+ times → compare with similar", () => {
    // Revisits interleaved with different products (not an A↔B alternation).
    const evs = [
      view("acer-swift-go-14", T0),
      view("asus-tuf-a15", T0 + 1000),
      view("hp-victus-15", T0 + 2000),
      view("acer-swift-go-14", T0 + 3000),
      view("lenovo-loq-15", T0 + 4000),
      view("msi-modern-14", T0 + 5000),
      view("acer-swift-go-14", T0 + 6000),
    ];
    expect(shown(evaluate(input(evs.slice(0, 4))))).toBeNull();
    const n = shown(evaluate(input(evs)));
    expect(n?.type).toBe("revisit");
    expect(n?.actions[0].message).toBe("Compare the Swift Go 14 with similar ones");
  });

  it("2. two products alternated 2+ times → side by side (takes priority over revisit)", () => {
    const a = "acer-swift-go-14";
    const b = "lenovo-ideapad-slim-5-14";
    expect(shown(evaluate(input([view(a, T0), view(b, T0 + 1)])))).toBeNull();
    const n = shown(evaluate(input([view(a, T0), view(b, T0 + 1), view(a, T0 + 2)])));
    expect(n?.type).toBe("alternate");
    expect(n?.actions[0].message).toBe("Compare the IdeaPad Slim 5 14 and the Swift Go 14");
  });

  it("3. price filter changed 3+ times within 60 s", () => {
    expect(shown(evaluate(input([price(T0), price(T0 + 10_000)])))).toBeNull();
    expect(shown(evaluate(input([price(T0), price(T0 + 10_000), price(T0 + 20_000)])))?.type).toBe("price_thrash");
    // Spread over more than 60 s: no nudge.
    expect(shown(evaluate(input([price(T0), price(T0 + 40_000), price(T0 + 80_000)])))).toBeNull();
  });

  it("4. item removed from cart → cheaper alternative", () => {
    const n = shown(evaluate(input([{ type: "cart_remove", productId: "sony-wh-1000xm5", at: T0 }])));
    expect(n?.type).toBe("removed");
    expect(n?.actions[0].message).toBe("Find a cheaper alternative to the WH-1000XM5");
  });
});

describe("gates", () => {
  const evs = [{ type: "cart_remove" as const, productId: "sony-wh-1000xm5", at: T0 }];

  it("max one nudge per 90 s", () => {
    const now = T0 + 10;
    expect(evaluate(input(evs, { lastNudgeAt: now - 30_000 }))).toMatchObject({ blocked: "cooldown" });
    expect(shown(evaluate(input(evs, { lastNudgeAt: now - NUDGE_CONFIG.cooldownMs - 1 })))).not.toBeNull();
  });

  it("never while typing; tells the caller when to retry", () => {
    const d = evaluate(input(evs, { lastTypingAt: T0 }));
    expect(d).toMatchObject({ blocked: "typing", retryAt: T0 + NUDGE_CONFIG.typingQuietMs });
  });

  it("never when paused or while chatting", () => {
    expect(evaluate(input(evs, { paused: true }))).toMatchObject({ blocked: "paused" });
    expect(evaluate(input(evs, { busy: true }))).toMatchObject({ blocked: "busy" });
  });

  it("dismissing a type suppresses it; each subject fires once", () => {
    expect(evaluate(input(evs, { dismissedTypes: ["removed"] }))).toBeNull();
    expect(evaluate(input(evs, { firedKeys: ["removed:sony-wh-1000xm5"] }))).toBeNull();
  });

  it("time passing with no new signals never produces a nudge", () => {
    expect(evaluate(input([], { now: T0 + 10 * 60_000 }))).toBeNull();
    // A stale removal (user went idle afterwards) doesn't fire later either.
    expect(evaluate(input(evs, { now: T0 + 5 * 60_000 }))).toBeNull();
  });
});
