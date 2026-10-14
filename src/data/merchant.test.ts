import { describe, expect, it } from "vitest";
import { getProduct } from "@/lib/commerce/catalog";
import { buildTip } from "@/lib/guide/tips";
import { CART_ACTIONS, FUNNEL, KPIS, MISSING_INFO } from "./merchant";

const KEYWORDS: Record<string, RegExp> = {
  "Keyboard backlight": /backlit|backlight/i,
  "RAM upgradeable?": /upgrad|soldered/i,
  "eSIM support": /esim/i,
  "VESA mount size": /vesa/i,
  "Screen brightness (nits)": /nits/i,
};

describe("merchant mock data", () => {
  it("missing-info rows point at real products that really lack the field", () => {
    for (const m of MISSING_INFO) {
      const p = getProduct(m.productId);
      expect(p, m.productId).toBeDefined();
      expect(KEYWORDS[m.field], m.field).toBeDefined();
      expect(JSON.stringify(p), `${m.productId} already lists ${m.field}`).not.toMatch(KEYWORDS[m.field]);
    }
  });

  it("the funnel only narrows and the verified KPI matches the cart counts", () => {
    for (let i = 1; i < FUNNEL.length; i++) expect(FUNNEL[i].value).toBeLessThanOrEqual(FUNNEL[i - 1].value);
    const verified = KPIS.find((k) => k.key === "verified")!;
    expect(verified.value).toBeCloseTo((CART_ACTIONS.verified / CART_ACTIONS.total) * 100, 1);
    expect(CART_ACTIONS.total - CART_ACTIONS.verified).toBe(CART_ACTIONS.caught);
    expect(KPIS.find((k) => k.key === "assisted")!.value).toBe(FUNNEL[1].value);
  });

  it("Pip has a tip for every dashboard section", () => {
    const ctx = (anchorId: string) => ({ page: "merchant" as const, anchor: { id: anchorId, topic: "", productId: null }, product: null, category: null, cart: { count: 0, subtotal: 0 } });
    for (const k of KPIS) expect(buildTip("merchant-kpi", 1, ctx(`kpi:${k.key}`))?.text.length).toBeGreaterThan(20);
    expect(buildTip("merchant-funnel", 1, ctx("merchant-funnel"))?.text).toContain("compared products");
    for (const t of ["merchant-questions", "merchant-missing", "merchant-friction"]) expect(buildTip(t, 1, ctx(t))).not.toBeNull();
  });
});
