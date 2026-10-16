import { NextResponse } from "next/server";
import { addToCart, clearCart, getCart, removeFromCart, setQty, type CartResult } from "@/lib/commerce/cartStore";
import { resolveChaos, rollFailure, simulateLatency } from "@/lib/commerce/chaos";
import { errorResponse, getSessionId, readJson, transientError } from "@/lib/commerce/http";
import { AddToCartInputSchema, SetQtyInputSchema } from "@/lib/commerce/schemas";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * GET    /api/cart                         → Cart
 * POST   /api/cart  { productId, qty? }    → add (qty defaults to 1)
 * PATCH  /api/cart  { productId, qty }     → set quantity (0 removes)
 * DELETE /api/cart?productId=…             → remove one line; no productId clears the cart
 */

function respond(result: CartResult) {
  if (!result.ok) return errorResponse(result.code, result.message);
  return NextResponse.json({ cart: result.cart });
}

export async function GET(req: Request) {
  const proxied = await proxyToBackend(req, "/api/cart");
  if (proxied) return proxied;

  const sid = await getSessionId();
  const chaos = resolveChaos(req);
  await simulateLatency(chaos);
  if (rollFailure(chaos, { mutation: false })) return transientError();
  return NextResponse.json({ cart: getCart(sid) });
}

export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/cart");
  if (proxied) return proxied;

  const sid = await getSessionId();
  const parsed = AddToCartInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Expected { productId: string, qty?: 1–10 }.");

  const chaos = resolveChaos(req);
  await simulateLatency(chaos);
  const failure = rollFailure(chaos, { mutation: true });
  if (failure === "transient") return transientError();
  return respond(addToCart(sid, parsed.data, { dropWrite: failure === "silent" }));
}

export async function PATCH(req: Request) {
  const proxied = await proxyToBackend(req, "/api/cart");
  if (proxied) return proxied;

  const sid = await getSessionId();
  const parsed = SetQtyInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return errorResponse("INVALID_INPUT", "Expected { productId: string, qty: 0–10 }.");

  const chaos = resolveChaos(req);
  await simulateLatency(chaos);
  const failure = rollFailure(chaos, { mutation: true });
  if (failure === "transient") return transientError();
  return respond(setQty(sid, parsed.data, { dropWrite: failure === "silent" }));
}

export async function DELETE(req: Request) {
  const proxied = await proxyToBackend(req, "/api/cart");
  if (proxied) return proxied;

  const sid = await getSessionId();
  const productId = new URL(req.url).searchParams.get("productId");

  const chaos = resolveChaos(req);
  await simulateLatency(chaos);
  if (!productId) return NextResponse.json({ cart: clearCart(sid) });

  const failure = rollFailure(chaos, { mutation: true });
  if (failure === "transient") return transientError();
  return respond(removeFromCart(sid, productId, { dropWrite: failure === "silent" }));
}
