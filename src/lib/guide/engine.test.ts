import { describe, expect, it } from "vitest";
import { getProduct } from "@/lib/commerce/catalog";
import type { Product } from "@/lib/commerce/schemas";
import { afterClose, afterShow, decide, emptyGuideState, GUIDE_CONFIG, type Gates, type GuideState, type Trigger } from "./engine";
import { lighterThanPct } from "./stats";
import { buildTip, standoutFact, TIPS, type TipCtx } from "./tips";

const swift = getProduct("acer-swift-go-14") as Product;
const T = 1_000_000;
const gates = (over: Partial<Gates> = {}): Gates => ({ now: T, typing: false, dragging: false, scrolling: false, modalFocused: false, bubbleBusy: false, ...over });
const ctx = (over: Partial<TipCtx> = {}): TipCtx => ({ page: "product", anchor: null, product: swift, category: "laptops", cart: { count: 0, subtotal: 0 }, ...over });
const idleOn = (id: string, topic: string): Trigger => ({ kind: "idle", anchor: { id, topic, productId: swift.id } });

function run(trigger: Trigger, state: GuideState, g = gates(), c = ctx()) {
  const d = decide(trigger, state, g, c);
  return { d, state: "show" in d ? afterShow(state, d, trigger, g.now) : state };
}

describe("escalation ladder", () => {
  it("tip → question → quiet on the same anchor", () => {
    let s = emptyGuideState();
    const t = idleOn("spec:battery", "spec-battery");
    const a = run(t, s);
    expect("show" in a.d && a.d.level).toBe(1);
    expect("show" in a.d && a.d.show.text).toMatch(/^10 h, longer than \d+% of the laptops here/);
    s = a.state;
    const b = run(t, s, gates({ now: T + GUIDE_CONFIG.cooldownMs + 1 }));
    expect("show" in b.d && b.d.level).toBe(2);
    expect("show" in b.d && b.d.show.chips?.[0].message).toBe("Compare the Swift Go 14 with similar ones");
    s = b.state;
    expect(run(t, s, gates({ now: T + 2 * GUIDE_CONFIG.cooldownMs + 2 })).d).toEqual({ blocked: "exhausted" });
  });

  it("never repeats a tip id", () => {
    const s = { ...emptyGuideState(), seenTipIds: [`spec-battery:1:${swift.id}`, `spec-battery:2:${swift.id}`] };
    expect(decide(idleOn("spec:battery-2", "spec-battery"), s, gates(), ctx())).toEqual({ blocked: "nothing" });
  });

  it("scroll arrivals only give first-level tips for whitelisted topics", () => {
    const s = emptyGuideState();
    expect(decide({ kind: "scroll", anchor: { id: "card:x", topic: "product-card", productId: swift.id } }, s, gates(), ctx())).toEqual({ blocked: "nothing" });
    const d = decide({ kind: "scroll", anchor: { id: "delivery", topic: "delivery", productId: swift.id } }, s, gates(), ctx());
    expect("show" in d && d.level).toBe(1);
  });
});

describe("guardrails", () => {
  const t = idleOn("card:swift", "product-card");
  it.each<[Partial<Gates>, string]>([
    [{ typing: true }, "typing"],
    [{ dragging: true }, "dragging"],
    [{ scrolling: true }, "scrolling"],
    [{ modalFocused: true }, "modal"],
    [{ bubbleBusy: true }, "bubble"],
  ])("blocked when %o", (g, reason) => {
    expect(decide(t, emptyGuideState(), gates(g), ctx())).toEqual({ blocked: reason });
  });

  it("quiet mode and pause disable all proactive triggers", () => {
    expect(decide(t, { ...emptyGuideState(), quiet: true }, gates(), ctx())).toEqual({ blocked: "quiet" });
    expect(decide({ kind: "route", page: "home" }, { ...emptyGuideState(), paused: true }, gates(), ctx())).toEqual({ blocked: "paused" });
  });

  it("cooldown between proactive bubbles, longer after a dismissal", () => {
    expect(decide(t, { ...emptyGuideState(), lastProactiveAt: T - 5_000 }, gates(), ctx())).toEqual({ blocked: "cooldown" });
    expect(decide(t, { ...emptyGuideState(), lastDismissAt: T - 18_000 }, gates(), ctx())).toEqual({ blocked: "after-dismiss" });
    expect("show" in decide(t, { ...emptyGuideState(), lastProactiveAt: T - 16_000 }, gates(), ctx())).toBe(true);
  });

  it("three dismissals in a row → quiet; engaging resets the streak", () => {
    let s = emptyGuideState();
    s = afterClose(s, "user", T).state;
    s = afterClose(s, "engaged", T).state;
    expect(s.dismissStreak).toBe(0);
    let r = afterClose(s, "user", T);
    r = afterClose(r.state, "user", T);
    expect(r.goQuiet).toBe(false);
    r = afterClose(r.state, "user", T);
    expect(r.goQuiet).toBe(true);
    expect(r.state.quiet).toBe(true);
    // Timeouts aren't dismissals.
    expect(afterClose(emptyGuideState(), "timeout", T).state.dismissStreak).toBe(0);
  });

  it("an intro only briefly delays element tips (not the full cooldown)", () => {
    const intro = run({ kind: "route", page: "product" }, emptyGuideState());
    const t = idleOn("spec:battery", "spec-battery");
    expect(decide(t, intro.state, gates({ now: T + 3_000 }), ctx())).toEqual({ blocked: "cooldown" });
    expect("show" in decide(t, intro.state, gates({ now: T + GUIDE_CONFIG.afterIntroMs + 1 }), ctx())).toBe(true);
  });

  it("page intros say hello once per page type", () => {
    const tr: Trigger = { kind: "route", page: "product" };
    const a = run(tr, emptyGuideState());
    expect("show" in a.d && a.d.show.text).toContain("Swift Go 14");
    expect(decide(tr, a.state, gates(), ctx())).toEqual({ blocked: "exhausted" });
  });
});

describe("tips use real catalog data", () => {
  it("weight percentile matches the catalog", () => {
    const pct = lighterThanPct(swift)!;
    expect(buildTip("spec-weight", 1, ctx())?.text).toBe(`1.32 kg: lighter than ${pct}% of the laptops here.`);
  });

  it("standout fact picks a true, strong fact", () => {
    expect(standoutFact(swift)).toMatch(/lighter than \d+%|beats \d+%|cheaper than \d+%/);
    expect(standoutFact(getProduct("lenovo-thinkpad-e14-g6")!)).toContain("out of stock");
  });

  it("every topic builds without throwing for a laptop and an accessory", () => {
    for (const p of [swift, getProduct("logitech-mx-master-3s")!]) {
      for (const [topic, levels] of Object.entries(TIPS)) {
        for (const level of [1, 2] as const) {
          if (!levels[level]) continue;
          const tip = buildTip(topic, level, ctx({ product: p, category: p.category }));
          if (tip) expect(tip.text.length).toBeGreaterThan(10);
        }
      }
    }
  });
});
