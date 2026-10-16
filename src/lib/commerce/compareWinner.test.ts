import { describe, expect, it } from "vitest";
import { getComparisonWinner } from "./compareWinner";

describe("getComparisonWinner", () => {
  it("returns null result when fewer than 2 valid products are provided", () => {
    const res = getComparisonWinner(["lenovo-ideapad-slim-5-14"]);
    expect(res.products).toHaveLength(1);
    expect(res.result).toBeNull();
    expect(res.winner).toBeNull();
    expect(res.isWinner("lenovo-ideapad-slim-5-14")).toBe(false);
  });

  it("calculates winner and row winners when 2 valid products are compared", () => {
    const res = getComparisonWinner(["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]);
    expect(res.products).toHaveLength(2);
    expect(res.result).not.toBeNull();
    expect(res.verdict).toBeTruthy();

    const winnerId = res.winnerId;
    if (winnerId) {
      expect(res.isWinner(winnerId)).toBe(true);
      expect(res.winner?.id).toBe(winnerId);
    }
  });

  it("filters out unknown product IDs gracefully", () => {
    const res = getComparisonWinner(["lenovo-ideapad-slim-5-14", "non-existent-product"]);
    expect(res.products).toHaveLength(1);
    expect(res.result).toBeNull();
  });
});
