import { describe, expect, it } from "vitest";
import { parseAmount, parseBudget } from "./money";

describe("parseAmount", () => {
  it.each([
    ["1 lakh 20 thousand", 120_000],
    ["1 lakh and 20 thousand", 120_000],
    ["1 lakh 20", 120_000],
    ["1.2 lakh", 120_000],
    ["1.2 lakhs", 120_000],
    ["1.2 lacs", 120_000],
    ["1.2L", 120_000],
    ["120k", 120_000],
    ["120K", 120_000],
    ["1,20,000", 120_000],
    ["120,000", 120_000],
    ["120000", 120_000],
    ["Rs 1,20,000", 120_000],
    ["Rs. 1,20,000", 120_000],
    ["rs1,20,000", 120_000],
    ["NPR 120000", 120_000],
    ["रु 1,20,000", 120_000],
    ["रु. १,२०,०००", 120_000],
    ["रू 95,000", 95_000],
    ["50 hajar", 50_000],
    ["2 crore", 20_000_000],
  ])("%s → %d", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});

describe("parseBudget", () => {
  it("handles the demo-script phrasing", () => {
    expect(
      parseBudget("I need a laptop under 1 lakh 20 thousand for full-stack development, good battery, enough RAM for Docker."),
    ).toEqual({ max: 120_000 });
  });

  it.each([
    ["under 1.2 lakh", { max: 120_000 }],
    ["below 80k", { max: 80_000 }],
    ["within 95,000", { max: 95_000 }],
    ["max 1.5 lakhs", { max: 150_000 }],
    ["up to 60k", { max: 60_000 }],
    ["upto रु 60,000", { max: 60_000 }],
    ["less than 75,000 rupees", { max: 75_000 }],
    ["budget is Rs 1,20,000", { max: 120_000 }],
    ["above 1 lakh", { min: 100_000 }],
    ["at least 50k", { min: 50_000 }],
    ["something around 90k", { max: 90_000 }],
    ["headphones under 5000", { max: 5_000 }],
  ])("%s", (input, expected) => {
    expect(parseBudget(input)).toEqual(expected);
  });

  it.each([
    ["between 50k and 80k", { min: 50_000, max: 80_000 }],
    ["50-80k", { min: 50_000, max: 80_000 }],
    ["50k - 80k", { min: 50_000, max: 80_000 }],
    ["1-1.5 lakh", { min: 100_000, max: 150_000 }],
    ["1 to 1.5 lakh", { min: 100_000, max: 150_000 }],
    ["रु 50,000 – 80,000", { min: 50_000, max: 80_000 }],
    ["at least 50k but under 1 lakh", { min: 50_000, max: 100_000 }],
  ])("range: %s", (input, expected) => {
    expect(parseBudget(input)).toEqual(expected);
  });

  it("ignores spec numbers next to a real budget", () => {
    expect(parseBudget("16GB RAM laptop under 1 lakh")).toEqual({ max: 100_000 });
    expect(parseBudget("14 inch, 16 GB, 512 GB SSD, under 1.2L")).toEqual({ max: 120_000 });
    expect(parseBudget("120k with 16 cores")).toEqual({ max: 120_000 });
    expect(parseBudget("at least 10 hours battery under 1 lakh")).toEqual({ max: 100_000 });
  });

  it.each([
    "i7 laptop with 512 GB SSD",
    "Ryzen 7 7735HS with 16GB",
    "Core i7-1355U",
    "RTX 4060 gaming laptop",
    "Galaxy S24 FE",
    "a 6000 mAh phone",
    "2 year warranty",
    "15.6 inch screen",
    "",
  ])("returns null when no price: %s", (input) => {
    expect(parseBudget(input)).toBeNull();
  });
});
