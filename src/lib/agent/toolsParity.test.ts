import { describe, expect, it } from "vitest";
import type { Cart, Product } from "@/lib/commerce/schemas";
import { executeTool, TOOLS } from "./tools";

describe("Tool Registry Parity (TypeScript)", () => {
  it("defines all 8 standard commerce tools", () => {
    const expectedTools = [
      "search_products",
      "get_product",
      "compare_products",
      "check_stock",
      "get_delivery_info",
      "add_to_cart",
      "remove_from_cart",
      "get_cart",
    ];
    expect(Object.keys(TOOLS).sort()).toEqual(expectedTools.sort());
  });

  it("has correct mutation flags", () => {
    expect(TOOLS.add_to_cart.mutation).toBe(true);
    expect(TOOLS.remove_from_cart.mutation).toBe(true);
    expect(TOOLS.search_products.mutation).toBeFalsy();
    expect(TOOLS.get_product.mutation).toBeFalsy();
    expect(TOOLS.compare_products.mutation).toBeFalsy();
    expect(TOOLS.check_stock.mutation).toBeFalsy();
    expect(TOOLS.get_delivery_info.mutation).toBeFalsy();
    expect(TOOLS.get_cart.mutation).toBeFalsy();
  });

  it("formats summaries identically to specification", () => {
    // search_products
    expect(TOOLS.search_products.summarize({ total: 0, searched: 12, products: [] })).toBe("0 results of 12");
    expect(TOOLS.search_products.summarize({ total: 1, searched: 12, products: [] })).toBe("1 result of 12");
    expect(TOOLS.search_products.summarize({ total: 5, searched: 12, products: [] })).toBe("5 results of 12");

    // get_product
    expect(TOOLS.get_product.summarize({ brand: "Lenovo", name: "IdeaPad Slim 5" } as unknown as Product)).toBe("Lenovo IdeaPad Slim 5");

    // compare_products
    expect(TOOLS.compare_products.summarize({ productIds: ["a", "b"], winnerId: "a", verdict: "A wins", advantages: {} })).toBe("2 products · winner found");
    expect(TOOLS.compare_products.summarize({ productIds: ["a", "b", "c"], winnerId: null, verdict: "Close call", advantages: {} })).toBe("3 products · close call");

    // check_stock
    expect(TOOLS.check_stock.summarize({ productId: "p1", inStock: true, quantity: 4 })).toBe("in stock (4)");
    expect(TOOLS.check_stock.summarize({ productId: "p1", inStock: false, quantity: 0 })).toBe("out of stock");

    // get_delivery_info
    expect(TOOLS.get_delivery_info.summarize({ city: "Kathmandu", days: "1-2 days", zone: "valley", fee: 0, freeOver: 50000 })).toBe("Kathmandu · 1-2 days");

    // add_to_cart & remove_from_cart
    expect(TOOLS.add_to_cart.summarize({ cart: {} as unknown as Cart })).toBe("Added to cart, stock confirmed");
    expect(TOOLS.remove_from_cart.summarize({ cart: {} as unknown as Cart })).toBe("Removed from cart");

    // get_cart
    expect(TOOLS.get_cart.summarize({ itemCount: 1, subtotal: 120000 } as unknown as Cart)).toBe("1 item · NPR 1,20,000");
    expect(TOOLS.get_cart.summarize({ itemCount: 3, subtotal: 450000 } as unknown as Cart)).toBe("3 items · NPR 4,50,000");
  });

  it("maps error codes to exact standard summaries with service unavailable for 503", async () => {
    // Transient failure simulation
    const res = await executeTool("search_products", {}, {
      sessionId: "test",
      chaos: { failureRate: 1, latencyMin: 0, latencyMax: 0, silentDrop: false },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("TRANSIENT");
      expect(res.error.message).toBe("Store service unavailable.");
      expect(res.summary).toBe("service unavailable");
    }

    // Invalid input error mapping
    const badInputRes = await executeTool("search_products", { limit: -1 }, {
      sessionId: "test",
      chaos: { failureRate: 0, latencyMin: 0, latencyMax: 0, silentDrop: false },
    });
    expect(badInputRes.ok).toBe(false);
    if (!badInputRes.ok) {
      expect(badInputRes.error.code).toBe("INVALID_INPUT");
      expect(badInputRes.summary).toBe("invalid request");
    }
  });
});
