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

  it("handles three products and missing specs", () => {
    const r = compareProducts([ideapad, swift, p("sony-wh-1000xm5")]);
    expect(r.rows.find((x) => x.key === "ram")!.values["sony-wh-1000xm5"]).toBe("—");
    expect(r.productIds).toHaveLength(3);
  });
});
