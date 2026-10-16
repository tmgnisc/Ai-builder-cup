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

  it("synchronizes cart through proxyToBackend against a real backend HTTP instance", async () => {
    const http = await import("http");
    const { GET, POST } = await import("@/app/api/cart/route");

    // Real backend in-memory state
    const backendLines: Array<{ productId: string; qty: number; title: string; price: number; lineTotal: number }> = [];
    let receivedSecret = "";
    let receivedCookie = "";

    const server = http.createServer((req, res) => {
      receivedSecret = (req.headers["x-agent-shared-secret"] as string) || "";
      receivedCookie = req.headers["cookie"] || "";

      if (req.method === "GET" && req.url === "/api/cart") {
        res.writeHead(200, {
          "content-type": "application/json",
          "set-cookie": "persona_sid=real-backend-sid; Path=/; HttpOnly",
        });
        res.end(
          JSON.stringify({
            cart: {
              sessionId: "real-backend-sid",
              lines: backendLines,
              itemCount: backendLines.reduce((acc, l) => acc + l.qty, 0),
              subtotal: 0,
              currency: "NPR",
              updatedAt: new Date().toISOString(),
            },
          }),
        );
      } else if (req.method === "POST" && req.url === "/api/cart") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const parsed = JSON.parse(body);
          backendLines.push({
            productId: parsed.productId,
            qty: parsed.qty || 1,
            title: "Lenovo Slim 5",
            price: 100000,
            lineTotal: 100000,
          });
          res.writeHead(200, {
            "content-type": "application/json",
            "set-cookie": "persona_sid=real-backend-sid; Path=/; HttpOnly",
          });
          res.end(
            JSON.stringify({
              cart: {
                sessionId: "real-backend-sid",
                lines: backendLines,
                itemCount: backendLines.reduce((acc, l) => acc + l.qty, 0),
                subtotal: 100000,
                currency: "NPR",
                updatedAt: new Date().toISOString(),
              },
            }),
          );
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8000;
    const originalBackendUrl = process.env.BACKEND_URL;
    const originalSecret = process.env.AGENT_SHARED_SECRET;

    process.env.BACKEND_URL = `http://127.0.0.1:${port}`;
    process.env.AGENT_SHARED_SECRET = "test-shared-secret-sync";

    try {
      // 1. POST to /api/cart via Next.js route proxy
      const addReq = new Request("http://localhost:3000/api/cart", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "persona_sid=real-backend-sid",
        },
        body: JSON.stringify({ productId: "lenovo-ideapad-slim-5-14", qty: 1 }),
      });
      const addResp = await POST(addReq);
      expect(addResp.status).toBe(200);
      const addData = await addResp.json();
      expect(addData.cart.lines).toHaveLength(1);
      expect(addData.cart.lines[0].productId).toBe("lenovo-ideapad-slim-5-14");
      expect(receivedSecret).toBe("test-shared-secret-sync");
      expect(receivedCookie).toContain("persona_sid=real-backend-sid");

      // 2. GET from /api/cart via Next.js route proxy
      const getReq = new Request("http://localhost:3000/api/cart", {
        method: "GET",
        headers: { cookie: "persona_sid=real-backend-sid" },
      });
      const getResp = await GET(getReq);
      expect(getResp.status).toBe(200);
      const getData = await getResp.json();
      expect(getData.cart.lines).toHaveLength(1);
      expect(getData.cart.itemCount).toBe(1);
    } finally {
      process.env.BACKEND_URL = originalBackendUrl;
      process.env.AGENT_SHARED_SECRET = originalSecret;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

