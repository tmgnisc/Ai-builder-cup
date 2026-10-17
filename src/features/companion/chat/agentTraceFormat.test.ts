import { describe, expect, it } from "vitest";
import { formatToolLabel, formatToolSummary } from "./agentTraceFormat";

describe("agentTraceFormat", () => {
  it("formats running tool labels into shopper-friendly present continuous verbs", () => {
    expect(formatToolLabel("search_products", "running")).toBe("Searching catalog");
    expect(formatToolLabel("get_product", "running")).toBe("Checking product details");
    expect(formatToolLabel("compare_products", "running")).toBe("Comparing specifications");
    expect(formatToolLabel("check_stock", "running")).toBe("Checking inventory");
    expect(formatToolLabel("get_delivery_info", "running")).toBe("Checking delivery options");
    expect(formatToolLabel("add_to_cart", "running")).toBe("Adding to cart");
    expect(formatToolLabel("remove_from_cart", "running")).toBe("Updating cart");
    expect(formatToolLabel("get_cart", "running")).toBe("Verifying cart");
    expect(formatToolLabel("ui_action", "running")).toBe("Updating display");
  });

  it("formats completed tool labels into shopper-friendly past tense verbs", () => {
    expect(formatToolLabel("search_products", "ok")).toBe("Searched catalog");
    expect(formatToolLabel("get_product", "ok")).toBe("Checked product details");
    expect(formatToolLabel("compare_products", "ok")).toBe("Compared specifications");
    expect(formatToolLabel("check_stock", "ok")).toBe("Checked inventory");
    expect(formatToolLabel("get_delivery_info", "ok")).toBe("Checked delivery");
    expect(formatToolLabel("add_to_cart", "ok")).toBe("Added to cart");
    expect(formatToolLabel("remove_from_cart", "ok")).toBe("Updated cart");
    expect(formatToolLabel("get_cart", "ok")).toBe("Verified cart");
    expect(formatToolLabel("ui_action", "ok")).toBe("Updated display");
  });

  it("never leaks raw snake_case or backend function names for unknown tools", () => {
    expect(formatToolLabel("internal_backend_query")).toBe("Internal Backend Query");
    expect(formatToolLabel("custom_chaos_evaluator")).toBe("Custom Chaos Evaluator");
  });

  it("formats search results summaries from 'X results of Y' to shopper-friendly counts", () => {
    expect(formatToolSummary("4 results of 7")).toBe("4 products found");
    expect(formatToolSummary("1 result of 7")).toBe("1 product found");
    expect(formatToolSummary("0 results of 7")).toBe("0 products found");
  });

  it("sanitizes UI actions and removes raw 'UI:' prefixes", () => {
    expect(formatToolSummary("UI: open_compare")).toBe("Opened compare workspace");
    expect(formatToolSummary("UI: highlight")).toBe("Highlighted matching products");
  });

  it("formats cart verification and inventory status summaries", () => {
    expect(formatToolSummary("verified ✓ · store accepted")).toBe("Verified in cart");
    expect(formatToolSummary("NOT verified ✕ · store dropped write")).toBe("Could not verify");
    expect(formatToolSummary("in stock (4)")).toBe("In stock (4 units)");
  });
});
