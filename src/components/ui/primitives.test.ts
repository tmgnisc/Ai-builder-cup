import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Button, buttonClasses } from "./Button";
import { IconButton } from "./IconButton";
import { Price } from "./Price";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { focusRing, withFocusRing } from "./focusRing";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { buttonVariants } from "@heroui/styles";

describe("UI Kit Primitives", () => {
  it("Button includes shared focusRing class and respects variant/size", () => {
    const cls = buttonClasses({ variant: "primary", size: "md" });
    expect(cls).toContain("focus-visible:outline-accent-text");
    expect(cls).toContain("bg-accent");
    expect(cls).toContain("h-10");
  });

  it("HeroUI v3 style helper buttonVariants generates BEM classes while buttonClasses enforces Persona tokens", () => {
    // HeroUI's style helper outputs BEM classes
    const heroOutput = buttonVariants({ variant: "primary", size: "md" });
    expect(heroOutput).toContain("button");
    expect(heroOutput).toContain("button--primary");
    expect(heroOutput).toContain("button--md");

    // Persona's buttonClasses enforces the 8px radius scale and custom accent token
    const personaOutput = buttonClasses({ variant: "primary", size: "md" });
    expect(personaOutput).toContain("rounded-lg");
    expect(personaOutput).toContain("bg-accent");
    expect(personaOutput).toContain("text-accent-fg");
  });

  it("HeroUI Button component renders with data-slot='button' and matches buttonClasses", () => {
    const html = renderToString(
      React.createElement(Button, { variant: "secondary", size: "sm" }, "Action"),
    );
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('data-rac=""');
    expect(html).toContain("button");
    expect(html).toContain("bg-surface-2");
    expect(html).toContain("rounded-lg");
    expect(html).toContain("h-8");
  });

  it("IconButton renders a HeroUI icon-only button with its required aria-label", () => {
    const html = renderToString(
      React.createElement(
        IconButton,
        { "aria-label": "Close panel", size: "sm" },
        React.createElement("span", null, "X"),
      ),
    );
    expect(html).toContain('aria-label="Close panel"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("size-8");
  });

  it("Price renders NPR with tabular digits and font-mono", () => {
    const html = renderToString(React.createElement(Price, { amount: 150000, size: "lg" }));
    expect(html).toContain("NPR");
    expect(html).toContain("1,50,000");
    expect(html).toContain("tabular");
    expect(html).toContain("font-mono");
  });

  it("Card renders with rounded-card and default surface", () => {
    const html = renderToString(React.createElement(Card, null, "Card body"));
    expect(html).toContain("rounded-card");
    expect(html).toContain("bg-surface");
  });

  it("Badge renders with tone classes and dot indicator", () => {
    const html = renderToString(
      React.createElement(Badge, { tone: "success", dot: true }, "In Stock"),
    );
    expect(html).toContain("bg-listening/12");
    expect(html).toContain("In Stock");
    expect(html).toContain('aria-hidden="true"');
  });

  it("EmptyState has role='status' and ErrorState has role='alert'", () => {
    const emptyHtml = renderToString(React.createElement(EmptyState, { title: "No items found" }));
    expect(emptyHtml).toContain('role="status"');
    expect(emptyHtml).toContain("No items found");

    const errorHtml = renderToString(React.createElement(ErrorState, { message: "Network error occurred" }));
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain("Network error occurred");
  });

  it("withFocusRing appends focusRing to custom class names", () => {
    const combined = withFocusRing("custom-interactive-class");
    expect(combined).toContain(focusRing);
    expect(combined).toContain("custom-interactive-class");
  });

  it("Button loading uses React Aria's pending state (announced, focusable, presses blocked)", () => {
    const html = renderToString(React.createElement(Button, { loading: true }, "Save"));
    expect(html).toContain('data-pending="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain(' disabled=""');
  });
});
