import { describe, expect, it } from "vitest";
import { parseIntent } from "@/lib/agent/intent";
import { getProduct } from "@/lib/commerce/catalog";
import type { Product } from "@/lib/commerce/schemas";
import { afterShow, decide, emptyGuideState, GUIDE_CONFIG, type Gates, type Trigger } from "./engine";
import { CHECKINS, type PageType, type TipCtx } from "./tips";

const swift = getProduct("acer-swift-go-14") as Product;
const thinkpad = getProduct("lenovo-thinkpad-e14-g6") as Product;
const T = 1_000_000;
const gates = (over: Partial<Gates> = {}): Gates => ({ now: T, typing: false, dragging: false, scrolling: false, modalFocused: false, bubbleBusy: false, ...over });
const ctx = (over: Partial<TipCtx> = {}): TipCtx => ({ page: "product", anchor: null, product: swift, category: "laptops", cart: { count: 1, subtotal: swift.price }, ...over });

describe("idle check-ins", () => {
  it("asks once per page, then stays quiet", () => {
    const t: Trigger = { kind: "checkin", page: "product" };
    const d = decide(t, emptyGuideState(), gates(), ctx());
    expect("show" in d && d.show.text).toContain("Anything stopping you from getting the **Swift Go 14**");
    expect("show" in d && d.show.chips?.map((c) => c.label)).toContain("Something's confusing");
    const s = "show" in d ? afterShow(emptyGuideState(), d, t, T) : emptyGuideState();
    expect(decide(t, s, gates({ now: T + GUIDE_CONFIG.cooldownMs + 1 }), ctx())).toEqual({ blocked: "exhausted" });
    // A different product gets its own check-in.
    expect("show" in decide(t, s, gates({ now: T + GUIDE_CONFIG.cooldownMs + 1 }), ctx({ product: thinkpad }))).toBe(true);
  });

  it("respects the same gates as other proactive tips", () => {
    const t: Trigger = { kind: "checkin", page: "home" };
    expect(decide(t, { ...emptyGuideState(), lastProactiveAt: T - 5_000 }, gates(), ctx({ page: "home" }))).toEqual({ blocked: "cooldown" });
    expect(decide(t, { ...emptyGuideState(), quiet: true }, gates(), ctx({ page: "home" }))).toEqual({ blocked: "quiet" });
  });

  it("out-of-stock products offer an in-stock alternative", () => {
    const tip = CHECKINS.product!(ctx({ product: thinkpad }));
    expect(tip?.chips?.[0].label).toBe("Find one in stock");
  });

  it("every chip message is something the agent understands", () => {
    const pages: [PageType, Partial<TipCtx>][] = [
      ["home", { product: null, category: null }],
      ["category", { product: null }],
      ["product", {}],
      ["product", { product: thinkpad }],
      ["cart", {}],
      ["checkout", {}],
    ];
    for (const [page, over] of pages) {
      const tip = CHECKINS[page]!(ctx({ page, ...over }));
      expect(tip, page).not.toBeNull();
      for (const c of tip!.chips ?? []) if (c.message) expect(parseIntent(c.message).kind, c.message).not.toBe("unknown");
    }
  });
});
