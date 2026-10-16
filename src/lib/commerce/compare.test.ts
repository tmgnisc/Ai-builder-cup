import { describe, expect, it } from "vitest";
import { getProduct } from "./catalog";
import { compareProducts } from "./compare";
import type { Product } from "./schemas";

const p = (id: string) => getProduct(id) as Product;

describe("compareProducts", () => {
  const ideapad = p("lenovo-ideapad-slim-5-14");
  const swift = p("acer-swift-go-14");

  it("marks per-attribute winners from catalog values", () => {
    const r = compareProducts([ideapad, swift]);
    const row = (k: string) => r.rows.find((x) => x.key === k)!;
    expect(row("price").winners).toEqual([ideapad.id]);
    expect(row("battery").winners).toEqual([ideapad.id]);
    expect(row("weight").winners).toEqual([swift.id]);
    expect(row("ram").winners).toEqual([]); // both 16 GB
    expect(row("weight").values[swift.id]).toBe("1.32 kg");
  });

  it("produces grounded advantage phrases", () => {
    const r = compareProducts([ideapad, swift]);
    expect(r.advantages[ideapad.id]).toContain("2 h more battery");
    expect(r.advantages[ideapad.id]).toContain("NPR 5,499 cheaper");
    expect(r.advantages[ideapad.id]).toContain("double the storage");
    expect(r.advantages[swift.id]).toContain("140 g lighter");
  });

  it("writes a verdict naming the winner, its reasons and the trade-off", () => {
    const r = compareProducts([ideapad, swift], { context: "Docker + travel" });
    expect(r.winnerId).toBe(ideapad.id);
    expect(r.verdict).toMatch(/^For Docker \+ travel, the IdeaPad Slim 5 14 is the better fit: /);
    expect(r.verdict).toContain("same RAM");
    expect(r.verdict).toContain("140 g lighter");
  });

  it("respects priorities", () => {
    const r = compareProducts([ideapad, swift], { priorities: ["weight", "screen" as never] });
    // weight is now the dominant priority, but ideapad still wins more attributes overall
    expect(r.advantages[swift.id][0]).toBe("140 g lighter");
  });

  it("handles three products and missing specs with cross-category warning and unit normalization", () => {
    const xm5 = p("sony-wh-1000xm5");
    const r = compareProducts([ideapad, swift, xm5]);
    expect(r.rows.find((x) => x.key === "ram")!.values["sony-wh-1000xm5"]).toBe("—");
    expect(r.productIds).toHaveLength(3);
    // Cross-category warning: winnerId must be null, no better all-round pick
    expect(r.winnerId).toBeNull();
    expect(r.verdict).toContain("Comparing across different categories");
    expect(r.verdict).not.toContain("better all-round pick");
    // Unit normalization: weight row has >= 1000g products so all values normalized to kg
    const weightRow = r.rows.find((x) => x.key === "weight")!;
    expect(weightRow.values[ideapad.id]).toBe("1.46 kg");
    expect(weightRow.values[swift.id]).toBe("1.32 kg");
    expect(weightRow.values[xm5.id]).toBe("0.25 kg");
  });

  it("normalizes weight units to g when all products are under 1000g", () => {
    const xm5 = p("sony-wh-1000xm5");
    const bose = p("bose-qc-ultra-headphones");
    const r = compareProducts([xm5, bose]);
    const weightRow = r.rows.find((x) => x.key === "weight")!;
    expect(weightRow.values[xm5.id]).toBe("250 g");
    expect(weightRow.values[bose.id]).toBe("254 g");
  });

  it("prefers in-stock alternative when out-of-stock winner margin is small", () => {
    const thinkpadOos = p("lenovo-thinkpad-e14-g6");
    const macbook = p("apple-macbook-air-m3-13");
    expect(thinkpadOos.stock).toBe(0);
    expect(macbook.stock).toBeGreaterThan(0);
    const r = compareProducts([thinkpadOos, macbook]);
    // Thinkpad has higher specs (9.25 vs 7.25, diff 2.0) but is OOS; MacBook is in-stock
    expect(r.winnerId).toBe(macbook.id);
    expect(r.verdict).toContain("currently out of stock");
    expect(r.verdict).toContain('in-stock MacBook Air 13" (M3) is the recommended pick');
  });

  it("mentions out-of-stock winner when margin is large", () => {
    const thinkpadOos = p("lenovo-thinkpad-e14-g6");
    const pavilion = p("hp-pavilion-plus-14");
    expect(thinkpadOos.stock).toBe(0);
    const r = compareProducts([thinkpadOos, pavilion]);
    // Thinkpad margin > 2.0, so remains winner but annotated with currently out of stock
    expect(r.winnerId).toBe(thinkpadOos.id);
    expect(r.verdict).toContain("The ThinkPad E14 Gen 6 is the better all-round pick (currently out of stock)");
  });

  describe("verdict score scale boundary tests", () => {
    function makeLaptop(id: string, overrides: Partial<Product> = {}): Product {
      return {
        id,
        name: `Laptop ${id}`,
        brand: "BrandX",
        category: "laptops",
        price: 100000,
        rating: 4.5,
        stock: 5,
        tags: ["laptop"],
        specs: {
          ramGB: 16,
          storageGB: 512,
          batteryHours: 10,
          weightGrams: 1400,
          warrantyMonths: 12,
          screen: '14" IPS',
          cpu: "Intel i7",
        },
        ...overrides,
      };
    }

    it("prefers in-stock runner-up when margin is exactly 2.0", () => {
      // OOS prodA wins ram (1.0 pt) and warranty (1.0 pt); prodB has 0 pts. Margin = 2.0.
      const prodA = makeLaptop("oos-a", { stock: 0, specs: { ...makeLaptop("oos-a").specs, ramGB: 32, warrantyMonths: 24 } });
      const prodB = makeLaptop("in-b", { stock: 3, specs: { ...makeLaptop("in-b").specs, ramGB: 16, warrantyMonths: 12 } });
      const r = compareProducts([prodA, prodB], { priorities: [] });
      expect(r.scores["oos-a"]).toBe(2);
      expect(r.scores["in-b"]).toBe(0);
      expect(r.scores["oos-a"] - r.scores["in-b"]).toBe(2.0);
      expect(r.winnerId).toBe("in-b");
      expect(r.verdict).toContain("currently out of stock; the in-stock Laptop in-b is the recommended pick");
    });

    it("retains OOS winner with notice when margin is just over 2.0 (margin = 3.0)", () => {
      // prodA wins ram (1 pt) + warranty (1 pt) + storage (1 pt) = 3 pts. prodB = 0 pts. Margin = 3.0 > 2.0.
      const prodA = makeLaptop("oos-a", {
        stock: 0,
        specs: { ...makeLaptop("oos-a").specs, ramGB: 32, warrantyMonths: 24, storageGB: 1000 },
      });
      const prodB = makeLaptop("in-b", {
        stock: 3,
        specs: { ...makeLaptop("in-b").specs, ramGB: 16, warrantyMonths: 12, storageGB: 512 },
      });
      const r = compareProducts([prodA, prodB], { priorities: [] });
      expect(r.scores["oos-a"]).toBe(3);
      expect(r.scores["in-b"]).toBe(0);
      expect(r.scores["oos-a"] - r.scores["in-b"]).toBe(3.0);
      expect(r.winnerId).toBe("oos-a");
      expect(r.verdict).toContain("(currently out of stock)");
    });

    it("evaluates 3-4 products side-by-side within the same category", () => {
      const p1 = makeLaptop("l1", { price: 80000 }); // wins price (2 pts)
      const p2 = makeLaptop("l2", { price: 90000, specs: { ...makeLaptop("l2").specs, batteryHours: 15 } }); // wins battery (2 pts)
      const p3 = makeLaptop("l3", { price: 100000, specs: { ...makeLaptop("l3").specs, weightGrams: 1100 } }); // wins weight (2 pts)
      const p4 = makeLaptop("l4", { price: 110000, specs: { ...makeLaptop("l4").specs, ramGB: 32, storageGB: 1000 } }); // wins ram (1) + storage (1) = 2 pts

      const r = compareProducts([p1, p2, p3, p4]);
      expect(r.productIds).toEqual(["l1", "l2", "l3", "l4"]);
      expect(r.productIds).toHaveLength(4);
      expect(r.rows.length).toBeGreaterThan(5);

      // Storage row normalizes to TB since p4 has 1000 GB
      const storageRow = r.rows.find((x) => x.key === "storage")!;
      expect(storageRow.values["l1"]).toBe("0.5 TB");
      expect(storageRow.values["l4"]).toBe("1 TB");
    });

    it("keeps highest scoring product as winner when all products are out of stock", () => {
      const p1 = makeLaptop("oos-1", { stock: 0, price: 80000 }); // wins price (2 pts)
      const p2 = makeLaptop("oos-2", { stock: 0, price: 100000 }); // 0 pts
      const p3 = makeLaptop("oos-3", { stock: 0, price: 120000 }); // 0 pts
      const r = compareProducts([p1, p2, p3]);
      expect(r.winnerId).toBe("oos-1");
      expect(r.verdict).toContain("(currently out of stock)");
    });
  });
});
