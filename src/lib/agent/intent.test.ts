import { describe, expect, it } from "vitest";
import { findProductMentions, parseIntent, parseQuery, parseRef, resolveRef } from "./intent";

const DEMO = "I need a laptop under 1 lakh 20 thousand for full-stack development, good battery, enough RAM for Docker.";
const RESULTS = ["lenovo-ideapad-slim-5-14", "acer-swift-go-14", "lenovo-thinkpad-e14-g6"];

describe("parseQuery", () => {
  it("extracts the demo request", () => {
    const q = parseQuery(DEMO);
    expect(q).toMatchObject({ category: "laptops", maxPrice: 120_000, minRamGB: 16, minBatteryHours: 8 });
    expect(q.needs).toEqual(expect.arrayContaining(["full-stack development", "Docker", "good battery"]));
    expect(q.priorities).toEqual(expect.arrayContaining(["ram", "battery", "price"]));
  });

  it("infers categories from needs", () => {
    expect(parseQuery("noise-cancelling headphones for flights")).toMatchObject({ category: "headphones", tags: ["anc"] });
    expect(parseQuery("best camera phone below 90k")).toMatchObject({ category: "phones", maxPrice: 90_000, tags: ["camera"] });
    expect(parseQuery("something light for travel")).toMatchObject({ maxWeightGrams: 1500 });
  });

  it("reads explicit RAM and battery numbers", () => {
    expect(parseQuery("laptop with 24gb ram and 12 hours battery life")).toMatchObject({ minRamGB: 24, minBatteryHours: 12 });
  });
});

describe("findProductMentions", () => {
  it("matches names, preferring the longest alias", () => {
    expect(findProductMentions("add the ThinkPad")).toEqual(["lenovo-thinkpad-e14-g6"]);
    expect(findProductMentions("compare the iphone 16 pro and pixel 9")).toEqual(["apple-iphone-16-pro", "google-pixel-9"]);
    expect(findProductMentions("Swift Go 14 vs IdeaPad Slim 5")).toEqual(["acer-swift-go-14", "lenovo-ideapad-slim-5-14"]);
    expect(findProductMentions("a modern phone with a swift processor")).toEqual([]);
  });
});

describe("parseIntent + references (demo script)", () => {
  it("step 2: search", () => {
    expect(parseIntent(DEMO)).toMatchObject({ kind: "search" });
  });

  it("step 4: compare the first two", () => {
    const i = parseIntent("Compare the first two.");
    expect(i).toEqual({ kind: "compare", ref: { kind: "first_n", count: 2 } });
    expect(resolveRef(i.kind === "compare" ? i.ref : null, RESULTS)).toEqual(RESULTS.slice(0, 2));
  });

  it("step 5: add the lighter one", () => {
    const i = parseIntent("Add the lighter one to my cart.");
    expect(i).toMatchObject({ kind: "add", ref: { kind: "superlative", attr: "weight" } });
    expect(resolveRef(i.kind === "add" ? i.ref : null, RESULTS.slice(0, 2))).toEqual(["acer-swift-go-14"]);
  });

  it("step 6: add an out-of-stock item by name or ordinal", () => {
    expect(parseIntent("add the thinkpad to my cart")).toMatchObject({ kind: "add", ref: { kind: "names", productIds: ["lenovo-thinkpad-e14-g6"] } });
    const i = parseIntent("add the third one");
    expect(resolveRef(i.kind === "add" ? i.ref : null, RESULTS)).toEqual(["lenovo-thinkpad-e14-g6"]);
  });

  it("other intents", () => {
    expect(parseIntent("hi")).toEqual({ kind: "greet" });
    expect(parseIntent("what's in my cart?")).toEqual({ kind: "cart" });
    expect(parseIntent("checkout please")).toEqual({ kind: "checkout" });
    expect(parseIntent("remove the swift go")).toMatchObject({ kind: "remove" });
    expect(parseIntent("how long does delivery to Pokhara take?")).toEqual({ kind: "delivery", city: "pokhara" });
    expect(parseIntent("is it good for gaming?")).toEqual({ kind: "question", ref: { kind: "pronoun" }, topic: "gaming" });
    expect(parseIntent("add that instead")).toMatchObject({ kind: "add", ref: { kind: "suggested" } });
    expect(parseIntent("try again")).toEqual({ kind: "retry" });
    expect(parseIntent("cheaper ones", { hasPreviousQuery: true })).toMatchObject({ kind: "search", refinement: true });
    expect(parseIntent("blorp")).toEqual({ kind: "unknown" });
    expect(parseIntent("Show cheaper options", { hasPreviousQuery: true })).toMatchObject({ kind: "search", refinement: true });
    expect(parseIntent("Raise the budget", { hasPreviousQuery: true })).toMatchObject({ kind: "search", refinement: true });
    expect(parseIntent("Find a cheaper alternative to the Swift Go 14")).toMatchObject({ kind: "similar", cheaper: true, ref: { kind: "names" } });
    expect(parseIntent("Compare it with similar ones")).toMatchObject({ kind: "compare", ref: { kind: "pronoun" } });
    expect(parseIntent("Add the HP Pavilion to compare")).toMatchObject({ kind: "add_compare", ref: { kind: "names", productIds: ["hp-pavilion-plus-14"] } });
    expect(parseIntent("Add hp-pavilion-plus-14 to compare")).toMatchObject({ kind: "add_compare", ref: { kind: "names", productIds: ["hp-pavilion-plus-14"] } });
    expect(parseIntent("Remove the Swift Go from compare")).toMatchObject({ kind: "remove_compare", ref: { kind: "names", productIds: ["acer-swift-go-14"] } });
    expect(parseIntent("Add HP Pavilion", { onCompare: true })).toMatchObject({ kind: "add_compare", ref: { kind: "names", productIds: ["hp-pavilion-plus-14"] } });
    expect(parseIntent("Remove Swift Go", { onCompare: true })).toMatchObject({ kind: "remove_compare", ref: { kind: "names", productIds: ["acer-swift-go-14"] } });
  });

  it("superlatives over a pool", () => {
    expect(resolveRef(parseRef("the cheaper one"), RESULTS)).toEqual(["lenovo-ideapad-slim-5-14"]);
    expect(resolveRef(parseRef("the one with more ram"), RESULTS)).toEqual(["lenovo-thinkpad-e14-g6"]);
  });
});
