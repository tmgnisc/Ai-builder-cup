import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/commerce/schemas";

const sampleProduct: Product = {
  id: "sony-wh1000xm5",
  name: "WH-1000XM5",
  brand: "Sony",
  category: "headphones",
  price: 54999,
  stock: 12,
  description: "Industry leading noise canceling headphones",
  images: ["/images/sony-wh1000xm5.webp"],
  palette: ["var(--surface-2)", "var(--bg)"],
  badge: "bestseller",
  specs: {
    weightGrams: 250,
    batteryHours: 30,
    anc: true,
    warrantyMonths: 12,
    connectivity: "Bluetooth 5.2",
  },
};

describe("ProductCard & Grid Regression (Equal Height & Compact Spec Line)", () => {
  it("renders ProductCard with equal-height structure (h-full and flex-1 body)", () => {
    const html = renderToString(React.createElement(ProductCard, { product: sampleProduct }));
    expect(html).toContain("h-full");
    expect(html).toContain("flex-1");
    expect(html).toContain("justify-between");
  });

  it("renders compact muted spec line instead of old 3-column dl labels", () => {
    const html = renderToString(React.createElement(ProductCard, { product: sampleProduct }));
    // Compact spec line contains ANC and battery formatted with middot
    expect(html).toContain("30 h · ANC · 250 g");
    // Should NOT contain the old uppercase dt grid labels
    expect(html).not.toContain("NOISE C");
    expect(html).not.toContain("<dl");
  });

  it("quick-add button renders with accessible label and tooltip wrapper", () => {
    const html = renderToString(React.createElement(ProductCard, { product: sampleProduct }));
    expect(html).toContain('aria-label="Add Sony WH-1000XM5 to cart"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("Add to cart");
  });

  it("handles out-of-stock product with disabled state and appropriate label", () => {
    const oosProduct: Product = { ...sampleProduct, stock: 0 };
    const html = renderToString(React.createElement(ProductCard, { product: oosProduct }));
    expect(html).toContain('aria-label="Sony WH-1000XM5 is out of stock"');
    expect(html).toContain("Out of stock");
  });

  it("ensures four-item categories maintain equal-height cards without stretching layout", () => {
    // Simulate a 4-item category list
    const items = [1, 2, 3, 4].map((i) => ({
      ...sampleProduct,
      id: `item-${i}`,
      name: `Headphones Model ${i}`,
    }));

    const cardsHtml = items.map((p) => renderToString(React.createElement(ProductCard, { product: p })));
    for (const card of cardsHtml) {
      expect(card).toContain("h-full");
      expect(card).toContain("flex-1");
    }
  });
});
