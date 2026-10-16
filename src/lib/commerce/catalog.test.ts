import { describe, expect, it } from "vitest";
import { addToCart, getCart, removeFromCart } from "./cartStore";
import { getAllProducts, searchProducts } from "./catalog";
import { ProductSchema } from "./schemas";

const products = getAllProducts();

describe("catalog data", () => {
  it("validates every product against the schema", () => {
    for (const p of products) expect(() => ProductSchema.parse(p)).not.toThrow();
  });

  it("has unique ids and ~30 products across all categories", () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(products.length).toBeGreaterThanOrEqual(28);
    for (const c of ["laptops", "phones", "headphones", "accessories"]) {
      expect(products.some((p) => p.category === c)).toBe(true);
    }
    expect(products.filter((p) => p.stock === 0).length).toBeGreaterThanOrEqual(3);
  });

  it("demo query matches exactly three laptops, one of them out of stock", () => {
    const { products: hits } = searchProducts({ category: "laptops", maxPrice: 120_000, minRamGB: 16, minBatteryHours: 8 });
    expect(hits.map((p) => p.id).sort()).toEqual(
      ["acer-swift-go-14", "lenovo-ideapad-slim-5-14", "lenovo-thinkpad-e14-g6"].sort(),
    );
    expect(hits.filter((p) => p.stock === 0).map((p) => p.id)).toEqual(["lenovo-thinkpad-e14-g6"]);
    expect(searchProducts({ category: "laptops", maxPrice: 120_000, minRamGB: 16, minBatteryHours: 8, inStockOnly: true }).total).toBe(2);
  });

  it("text search matches tags and brands", () => {
    expect(searchProducts({ q: "docker" }).products.every((p) => p.tags.includes("docker-ready"))).toBe(true);
    expect(searchProducts({ q: "sony" }).products[0]?.id).toBe("sony-wh-1000xm5");
  });
});

describe("cart store", () => {
  const sid = "test-session";

  it("adds, verifies and removes lines", () => {
    const r = addToCart(sid, { productId: "acer-swift-go-14", qty: 1 });
    expect(r.ok).toBe(true);
    expect(getCart(sid).lines.find((l) => l.productId === "acer-swift-go-14")?.qty).toBe(1);
    expect(removeFromCart(sid, "acer-swift-go-14").ok).toBe(true);
    expect(getCart(sid).itemCount).toBe(0);
  });

  it("rejects out-of-stock items deterministically", () => {
    const r = addToCart(sid, { productId: "lenovo-thinkpad-e14-g6", qty: 1 });
    expect(r).toMatchObject({ ok: false, code: "OUT_OF_STOCK" });
  });

  it("silent chaos failures report success but don't persist (verify catches it)", () => {
    const r = addToCart(sid, { productId: "samsung-t7-1tb", qty: 1 }, { dropWrite: true });
    expect(r.ok).toBe(true);
    expect(getCart(sid).lines.some((l) => l.productId === "samsung-t7-1tb")).toBe(false);
  });

  it("enforces stock limits", () => {
    expect(addToCart(sid, { productId: "lenovo-loq-15", qty: 3 })).toMatchObject({ ok: false, code: "INSUFFICIENT_STOCK" });
  });
});
