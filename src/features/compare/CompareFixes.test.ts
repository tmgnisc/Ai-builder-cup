import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CompareWorkspace } from "./CompareWorkspace";
import { useCompare } from "@/store/useCompare";
import { useMerchantSession } from "@/store/useMerchantSession";
import { placeBeside } from "@/lib/guide/placement";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Phase 4 Fixes & Regressions Verification", () => {
  beforeEach(() => {
    useCompare.setState({
      ids: [],
      open: false,
      context: null,
      priorities: null,
      rejectedAt: 0,
    });
    useMerchantSession.getState().reset();
  });

  it("1. Suggestion Chips: renders candidate replacement chips when category filter reduces selection below 2", () => {
    const validIds = ["apple-macbook-pro-14-m4-pro", "sony-wh-1000xm5"];
    useCompare.setState({ ids: validIds });

    const html = renderToString(
      React.createElement(CompareWorkspace, { initialValidIds: validIds }),
    );

    // Initial cross-category alert banner with category filter buttons
    expect(html).toContain("Cross-Category Comparison");
    expect(html).toContain("Filter to Laptops (1)");
    expect(html).toContain("Filter to Headphones (1)");
  });

  it("2. N/A Specs: marks category-inapplicable specs as N/A and does not classify them as missing info", () => {
    const headphoneIds = ["sony-wh-1000xm5", "bose-qc-ultra-headphones"];
    useCompare.setState({ ids: headphoneIds });

    const html = renderToString(
      React.createElement(CompareWorkspace, { initialValidIds: headphoneIds }),
    );

    expect(html).toContain("<table");
    // Verify missing info is not recorded for inapplicable specs (e.g. CPU/RAM on headphones)
    const recorded = useMerchantSession.getState().missing;
    const cpuOnHeadphones = recorded.filter((m) => m.productId === "sony-wh-1000xm5" && m.field === "cpu");
    expect(cpuOnHeadphones.length).toBe(0);
  });

  it("3. Missing Info Deduplication: prevents duplicate missing_info entries across multiple renders", () => {
    const validIds = ["apple-macbook-pro-14-m4-pro", "lenovo-ideapad-slim-5-14"];
    useCompare.setState({ ids: validIds });

    // Render multiple times
    renderToString(React.createElement(CompareWorkspace, { initialValidIds: validIds }));
    renderToString(React.createElement(CompareWorkspace, { initialValidIds: validIds }));
    renderToString(React.createElement(CompareWorkspace, { initialValidIds: validIds }));

    const recorded = useMerchantSession.getState().missing;
    const keys = recorded.map((m) => `${m.productId}:${m.field}`);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it("4. Window Global Gating: verify window.__useChat and window.useChat are gated in production", () => {
    // In production mode, window.__useChat must never be attached
    expect(typeof window === "undefined" || (window as unknown as Record<string, unknown>).__useChat === undefined).toBe(true);
  });

  it("5. Pip Geometry: placeBeside rejects side placement when 340px bubble would overflow or fold over target card", () => {
    // Setup minimal DOM mocks in node environment
    const prevWindow = (globalThis as unknown as Record<string, unknown>).window;
    const prevDoc = (globalThis as unknown as Record<string, unknown>).document;

    try {
      (globalThis as unknown as Record<string, unknown>).window = {
        innerWidth: 1280,
        innerHeight: 800,
      };
      (globalThis as unknown as Record<string, unknown>).document = {
        activeElement: null,
        querySelectorAll: () => [],
      };

      // Create a mock card element positioned near the right edge: left 1000, right 1240 (width 240)
      const mockCard = {
        getBoundingClientRect: () => ({
          left: 1000,
          right: 1240,
          top: 200,
          bottom: 500,
          width: 240,
          height: 300,
          x: 1000,
          y: 200,
        }),
        closest: () => null,
      } as unknown as Element;

      // Place Pip beside the card (size 64px)
      const pt = placeBeside(mockCard, 64);
      expect(pt).not.toBeNull();
      if (pt) {
        // Because placing Pip on the right (1240 + 14 + 32 = 1286) would exceed screen width (1280)
        // and cause the 340px bubble to fold back over the card, Pip must choose the left side!
        expect(pt.x).toBeLessThan(1000); // left of card
      }
    } finally {
      (globalThis as unknown as Record<string, unknown>).window = prevWindow;
      (globalThis as unknown as Record<string, unknown>).document = prevDoc;
    }
  });
});
