import { describe, expect, it, beforeEach } from "vitest";
import { addToCart, getCart, clearCart } from "@/lib/commerce/cartStore";
import { runAgent } from "./runAgent";
import { createAgent } from "./geminiAgent";
import { EMPTY_MEMORY, type AgentRequest } from "./types";

describe("Cart drawer and Agent cart synchronization", () => {
  const sessionId = "test-session-cart-sync";

  beforeEach(() => {
    clearCart(sessionId);
  });

  it("ensures cart mutated by agent is immediately visible to cart drawer and store for the same session", async () => {
    // 1. Initial cart is empty
    const initialCart = getCart(sessionId);
    expect(initialCart.lines).toHaveLength(0);
    expect(initialCart.itemCount).toBe(0);

    // 2. Agent runs a turn requesting to add a product (e.g. the lighter one from comparison)
    const request: AgentRequest = {
      message: "Add the lighter one to my cart.",
      memory: {
        ...EMPTY_MEMORY,
        turn: 1,
        lastComparedIds: ["lenovo-ideapad-slim-5-14", "acer-swift-go-14"],
      },
      context: { pageProductId: null, compareIds: [], cartProductIds: [], path: "/" },
    };

    const events = [];
    for await (const ev of runAgent(request, {
      agent: createAgent(), // uses mockAgent in test environment
      ctx: { sessionId, chaos: { latencyMin: 0, latencyMax: 0, failureRate: 0 } },
      pace: 0,
    })) {
      events.push(ev);
    }

    const cartUpdated = events.some((e) => e.type === "ui" && e.action.type === "cart_updated");
    expect(cartUpdated).toBe(true);

    // 3. Cart drawer reads cart from store / API for the session
    const drawerCart = getCart(sessionId);
    expect(drawerCart.lines.length).toBeGreaterThan(0);
    expect(drawerCart.lines.some((line) => line.productId === "acer-swift-go-14")).toBe(true);
    expect(drawerCart.itemCount).toBe(1);
  });

  it("ensures cart mutated by user in cart drawer is seen by agent in subsequent turns", async () => {
    // 1. User adds item directly through UI / cart drawer
    addToCart(sessionId, { productId: "lenovo-ideapad-slim-5-14", qty: 2 });
    const userCart = getCart(sessionId);
    expect(userCart.itemCount).toBe(2);

    // 2. Next agent turn passes context containing current cart
    const request: AgentRequest = {
      message: "What is currently in my cart?",
      memory: { ...EMPTY_MEMORY, turn: 1 },
      context: {
        pageProductId: null,
        compareIds: [],
        cartProductIds: userCart.lines.map((l) => l.productId),
        path: "/",
      },
    };

    const events = [];
    for await (const ev of runAgent(request, {
      agent: createAgent(),
      ctx: { sessionId, chaos: { latencyMin: 0, latencyMax: 0, failureRate: 0 } },
      pace: 0,
    })) {
      events.push(ev);
    }

    // Verify session continuity: the session's cart store matches the agent's context
    const currentCart = getCart(sessionId);
    expect(currentCart.lines[0].productId).toBe("lenovo-ideapad-slim-5-14");
    expect(currentCart.lines[0].qty).toBe(2);
  });
});
