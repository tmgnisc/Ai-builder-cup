import { describe, expect, it } from "vitest";
import { parseAndValidateCompareIds, buildCompareUrl } from "./compareUrl";

describe("compareUrl validation", () => {
  it("parses valid comma-separated IDs", () => {
    const res = parseAndValidateCompareIds("lenovo-ideapad-slim-5-14,acer-swift-go-14");
    expect(res.validIds).toEqual(["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]);
    expect(res.products).toHaveLength(2);
    expect(res.hasRedirect).toBe(false);
    expect(res.redirectUrl).toBeNull();
  });

  it("drops duplicate IDs and keeps first occurrence", () => {
    const res = parseAndValidateCompareIds("lenovo-ideapad-slim-5-14,lenovo-ideapad-slim-5-14,acer-swift-go-14");
    expect(res.validIds).toEqual(["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]);
    expect(res.droppedDuplicates).toEqual(["lenovo-ideapad-slim-5-14"]);
    expect(res.hasRedirect).toBe(false);
  });

  it("drops unknown IDs and flags warning message", () => {
    const res = parseAndValidateCompareIds("lenovo-ideapad-slim-5-14,fake-laptop-xyz,acer-swift-go-14");
    expect(res.validIds).toEqual(["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]);
    expect(res.droppedUnknown).toEqual(["fake-laptop-xyz"]);
    expect(res.message).toContain("fake-laptop-xyz");
    expect(res.hasRedirect).toBe(false);
  });

  it("redirects when fewer than 2 valid products remain", () => {
    const res = parseAndValidateCompareIds("lenovo-ideapad-slim-5-14,nonexistent-123");
    expect(res.validIds).toEqual(["lenovo-ideapad-slim-5-14"]);
    expect(res.hasRedirect).toBe(true);
    expect(res.redirectUrl).toBe("/");
    expect(res.message).toContain("At least 2 products are required");
  });

  it("redirects on empty, null, or missing IDs", () => {
    expect(parseAndValidateCompareIds(null).hasRedirect).toBe(true);
    expect(parseAndValidateCompareIds("").hasRedirect).toBe(true);
    expect(parseAndValidateCompareIds(undefined).hasRedirect).toBe(true);
  });

  it("caps product IDs at MAX_COMPARE (4)", () => {
    const res = parseAndValidateCompareIds(
      "lenovo-ideapad-slim-5-14,acer-swift-go-14,apple-macbook-air-m3-13,lenovo-thinkpad-e14-g6,hp-pavilion-plus-14"
    );
    expect(res.validIds).toHaveLength(4);
    expect(res.products).toHaveLength(4);
  });

  it("builds compare URL correctly", () => {
    expect(buildCompareUrl(["a", "b", "c"])).toBe("/compare?ids=a,b,c");
  });
});
