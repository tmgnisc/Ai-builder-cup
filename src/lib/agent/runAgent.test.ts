import { describe, expect, it } from "vitest";
import { getCart } from "@/lib/commerce/cartStore";
import { mockAgent } from "./mockAgent";
import { runAgent } from "./runAgent";
import { AgentEventSchema, EMPTY_MEMORY, type AgentEvent, type AgentMemory } from "./types";

const NO_CHAOS = { latencyMin: 0, latencyMax: 0, failureRate: 0 };

async function turn(message: string, memory: AgentMemory, sessionId: string, failureRate = 0) {
  const events: AgentEvent[] = [];
  for await (const ev of runAgent(
    { message, memory, context: { pageProductId: null, compareIds: [], cartProductIds: getCart(sessionId).lines.map((l) => l.productId), path: "/" } },
    { agent: mockAgent, ctx: { sessionId, chaos: { ...NO_CHAOS, failureRate } }, pace: 0 },
  )) {
    expect(() => AgentEventSchema.parse(ev)).not.toThrow(); // every event is valid on the wire
    events.push(ev);
  }
  const mem = [...events].reverse().find((e) => e.type === "memory");
  const text = events.filter((e) => e.type === "text_delta").map((e) => (e as { delta: string }).delta).join("");
  const states = events.filter((e) => e.type === "state_change").map((e) => (e as { state: string }).state);
  const tools = events.filter((e) => e.type === "tool_result").map((e) => `${(e as { name: string }).name}:${(e as { ok: boolean }).ok}`);
  return { events, memory: mem?.type === "memory" ? mem.memory : memory, text, states, tools };
}

describe("demo script, end to end through the runtime", () => {
  const sid = `demo-${Math.random()}`;
  let memory = EMPTY_MEMORY;

  it("step 2–3: searches and presents 3 laptops, in-stock first", async () => {
    const r = await turn("I need a laptop under 1 lakh 20 thousand for full-stack development, good battery, enough RAM for Docker.", memory, sid);
    memory = r.memory;
    expect(r.states).toEqual(["thinking", "searching", "presenting", "speaking", "idle"]);
    expect(r.tools).toEqual(["search_products:true"]);
    expect(memory.lastResultIds).toEqual(["lenovo-ideapad-slim-5-14", "acer-swift-go-14", "lenovo-thinkpad-e14-g6"]);
    expect(r.events.some((e) => e.type === "block" && e.block.kind === "product_carousel")).toBe(true);
    expect(r.events.some((e) => e.type === "ui" && e.action.type === "highlight")).toBe(true);
    expect(r.text).toContain("out of stock");
    expect(r.events.at(-1)).toEqual({ type: "done" });
  });

  it("step 4: compares the first two with a grounded verdict", async () => {
    const r = await turn("Compare the first two.", memory, sid);
    memory = r.memory;
    expect(r.states[0]).toBe("comparing");
    expect(r.tools).toEqual(["compare_products:true"]);
    expect(r.text).toMatch(/^For full-stack development \+ Docker, the IdeaPad Slim 5 14 is the better fit/);
    expect(r.text).toContain("140 g lighter");
    expect(r.events.some((e) => e.type === "ui" && e.action.type === "open_compare")).toBe(true);
  });

  it("step 5: adds the lighter one, verifies with get_cart, then succeeds", async () => {
    const r = await turn("Add the lighter one to my cart.", memory, sid);
    memory = r.memory;
    expect(r.states).toEqual(["acting", "success"]);
    expect(r.tools).toEqual(["check_stock:true", "add_to_cart:true", "get_cart:true"]);
    const verified = r.events.find((e) => e.type === "block" && e.block.kind === "cart_action" && e.block.status === "verified");
    expect(verified).toBeDefined();
    expect(getCart(sid).lines.map((l) => l.productId)).toEqual(["acer-swift-go-14"]);
    expect(r.events.some((e) => e.type === "ui" && e.action.type === "cart_updated" && e.action.flyProductId === "acer-swift-go-14")).toBe(true);
  });

  it("step 6: out-of-stock → error state, honest message, alternative", async () => {
    const r = await turn("Add the ThinkPad to my cart", memory, sid);
    memory = r.memory;
    expect(r.states[0]).toBe("acting");
    expect(r.states.at(-1)).toBe("error");
    expect(r.tools.slice(0, 2)).toEqual(["check_stock:true", "search_products:true"]);
    expect(r.tools).not.toContain("add_to_cart:true");
    expect(r.text).toContain("out of stock");
    expect(r.text).toContain("nothing was added");
    expect(memory.suggestedId).toBe("lenovo-ideapad-slim-5-14"); // in budget, not already in the cart
    expect(getCart(sid).lines.map((l) => l.productId)).toEqual(["acer-swift-go-14"]);
  });

  it("ordinals refer to the results list even after a comparison", async () => {
    const r = await turn("add the third one", memory, sid);
    memory = r.memory;
    expect(r.states.at(-1)).toBe("error"); // the third result is the out-of-stock ThinkPad
  });

  it("follow-up: add the suggested alternative instead", async () => {
    const r = await turn("Add that instead", memory, sid);
    expect(r.states.at(-1)).toBe("success");
    expect(getCart(sid).lines).toHaveLength(2);
  });
});

describe("verify-after-act catches silent failures", () => {
  it("never claims success when get_cart disagrees", async () => {
    const sid = `chaos-${Math.random()}`;
    let memory = (await turn("laptop under 1.2 lakh with good battery for docker", EMPTY_MEMORY, sid)).memory;
    let sawUnverified = false;
    // With a 90% failure rate some adds fail loudly (TRANSIENT) and some silently; neither may report success.
    for (let i = 0; i < 12 && !sawUnverified; i++) {
      const r = await turn("add the first one", memory, sid, 0.9);
      memory = r.memory;
      const claimedSuccess = r.states.includes("success");
      const inCart = getCart(sid).lines.some((l) => l.productId === "lenovo-ideapad-slim-5-14");
      if (claimedSuccess) expect(inCart).toBe(true);
      if (r.events.some((e) => e.type === "tool_result" && e.name === "get_cart" && e.summary.startsWith("NOT verified"))) {
        sawUnverified = true;
        expect(r.states.at(-1)).toBe("error");
        expect(r.text).toContain("isn't there");
      }
    }
  });
});

describe("other intents", () => {
  it("checkout is never a tool; it navigates and says the user confirms", async () => {
    const sid = `co-${Math.random()}`;
    const r = await turn("checkout", EMPTY_MEMORY, sid);
    expect(r.tools).toEqual(["get_cart:true"]);
    expect(r.text).toContain("empty");
  });

  it("delivery info", async () => {
    const r = await turn("how long is delivery to Pokhara?", EMPTY_MEMORY, "d");
    expect(r.tools).toEqual(["get_delivery_info:true"]);
    expect(r.text).toContain("Pokhara");
  });
});

describe("nudge follow-ups are understood by the agent", () => {
  it("revisit → compares the product with similar in-stock ones", async () => {
    const r = await turn("Compare the Swift Go 14 with similar ones", EMPTY_MEMORY, `n-${Math.random()}`);
    expect(r.tools).toEqual(["search_products:true", "compare_products:true"]);
    expect(r.memory.lastComparedIds[0]).toBe("acer-swift-go-14");
    expect(r.memory.lastComparedIds.length).toBeGreaterThanOrEqual(2);
  });

  it("alternate → side-by-side of the two products", async () => {
    const r = await turn("Compare the IdeaPad Slim 5 14 and the Swift Go 14", EMPTY_MEMORY, `n-${Math.random()}`);
    expect(r.memory.lastComparedIds).toEqual(["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]);
  });

  it.each(["Show me the best value laptops", "Show the top rated laptops", "laptops with the best battery life"])("price thrash option: %s", async (m) => {
    const r = await turn(m, EMPTY_MEMORY, `n-${Math.random()}`);
    expect(r.tools[0]).toBe("search_products:true");
    expect(r.states).toContain("presenting");
  });

  it("removed → cheaper alternative", async () => {
    const r = await turn("Find a cheaper alternative to the WH-1000XM5", EMPTY_MEMORY, `n-${Math.random()}`);
    expect(r.tools).toEqual(["search_products:true"]);
    const carousel = r.events.find((e) => e.type === "block" && e.block.kind === "product_carousel");
    expect(carousel).toBeDefined();
    const ids = carousel && carousel.type === "block" && carousel.block.kind === "product_carousel" ? carousel.block.productIds : [];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain("sony-wh-1000xm5");
  });
});

describe("choreography (ui actions) on the store page", () => {
  it("search makes the grid show results and moves Pip to the first card; add rides to the cart before the success hop", async () => {
    const sid = `ch-${Math.random()}`;
    const r = await turn("laptop under 1.2 lakh with good battery for docker", EMPTY_MEMORY, sid);
    const ui = r.events.filter((e) => e.type === "ui").map((e) => (e.type === "ui" ? e.action.type : ""));
    expect(ui).toEqual(["highlight", "set_filters", "scroll_to", "move_to"]);

    const c = await turn("compare the first two", r.memory, sid);
    const cui = c.events.filter((e) => e.type === "ui").map((e) => (e.type === "ui" ? e.action : null));
    expect(cui[0]).toMatchObject({ type: "move_to", between: ["card:lenovo-ideapad-slim-5-14", "card:acer-swift-go-14"] });
    expect(cui.map((a) => a?.type)).toEqual(["move_to", "open_compare", "move_to"]);

    const a = await turn("add the lighter one", c.memory, sid);
    const order = a.events.filter((e) => e.type === "ui" || e.type === "state_change").map((e) => (e.type === "ui" ? `ui:${e.action.type}` : `state:${(e as { state: string }).state}`));
    expect(order).toEqual(["state:acting", "ui:move_to", "ui:cart_updated", "state:success"]);
  });
});
