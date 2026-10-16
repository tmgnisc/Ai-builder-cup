import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CompareWorkspace } from "./CompareWorkspace";
import { useCompare } from "@/store/useCompare";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("CompareWorkspace Component Tests", () => {
  beforeEach(() => {
    useCompare.setState({
      ids: [],
      open: false,
      context: null,
      priorities: null,
      rejectedAt: 0,
    });
  });

  it("renders accessible semantic table when 2+ valid products provided", () => {
    const validIds = ["apple-macbook-pro-14-m4-pro", "lenovo-thinkpad-e14-g6"];
    useCompare.setState({ ids: validIds });

    const html = renderToString(
      React.createElement(CompareWorkspace, { initialValidIds: validIds }),
    );

    // Table semantics
    expect(html).toContain("<table");
    expect(html).toContain('class="sr-only">Side-by-side product comparison');
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('scope="colgroup"');

    // Sticky product headers
    expect(html).toContain("MacBook Pro 14");
    expect(html).toContain("ThinkPad E14 Gen 6");
    expect(html).toContain("Apple");
    expect(html).toContain("Lenovo");

    // Add to cart buttons
    expect(html).toContain("Add to cart");
    expect(html).toContain('Remove Apple MacBook Pro 14');

    // Best-value marker with sr-only cue
    expect(html).toContain("(best value)");

    // Spec sections
    expect(html).toContain("Overview");
    expect(html).toContain("Performance");
    expect(html).toContain("Battery &amp; Weight");
  });

  it("renders differences-only toggle with accessible switch semantics", () => {
    const validIds = ["apple-macbook-pro-14-m4-pro", "lenovo-thinkpad-e14-g6"];
    useCompare.setState({ ids: validIds });

    const html = renderToString(
      React.createElement(CompareWorkspace, { initialValidIds: validIds }),
    );

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Show differences only");
  });

  it("shows cross-category warning banner when comparing across categories", () => {
    const validIds = ["apple-macbook-pro-14-m4-pro", "sony-wh-1000xm5"];
    useCompare.setState({ ids: validIds });

    const html = renderToString(
      React.createElement(CompareWorkspace, { initialValidIds: validIds }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Cross-Category Comparison");
    expect(html).toContain("Comparing across different categories");
    expect(html).toContain("Keep only");
  });

  it("renders friendly empty state when fewer than 2 products selected", () => {
    useCompare.setState({ ids: ["apple-macbook-pro-14-m4-pro"] });

    const html = renderToString(
      React.createElement(CompareWorkspace, { initialValidIds: ["apple-macbook-pro-14-m4-pro"] }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("Pick one more product to compare");
    expect(html).toContain("Suggested products to compare");
    expect(html).toContain("Browse Catalog");
  });

  it("renders error state when unknown products provided and 0 remain", () => {
    useCompare.setState({ ids: [] });

    const html = renderToString(
      React.createElement(CompareWorkspace, {
        initialValidIds: [],
        initialDroppedUnknown: ["nonexistent-1", "nonexistent-2"],
      }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Products not found");
    expect(html).toContain("nonexistent-1, nonexistent-2");
    expect(html).toContain("Return to Catalog");
  });

  it("renders live stock badges for each product", () => {
    const validIds = ["apple-macbook-pro-14-m4-pro", "lenovo-thinkpad-e14-g6"];
    useCompare.setState({ ids: validIds });

    const html = renderToString(
      React.createElement(CompareWorkspace, { initialValidIds: validIds }),
    );

    expect(html).toContain("Live Stock:");
    expect(html).toContain("Out of stock");
  });
});
