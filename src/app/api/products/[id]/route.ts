import { NextResponse } from "next/server";
import { getProduct } from "@/lib/commerce/catalog";
import { resolveChaos, rollFailure, simulateLatency } from "@/lib/commerce/chaos";
import { errorResponse, transientError } from "@/lib/commerce/http";
import { proxyToBackend } from "@/lib/server/backendProxy";

/** GET /api/products/:id */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyToBackend(req, `/api/products/${encodeURIComponent(id)}`);
  if (proxied) return proxied;

  const chaos = resolveChaos(req);
  await simulateLatency(chaos);
  if (rollFailure(chaos, { mutation: false })) return transientError();

  const product = getProduct(id);
  if (!product) return errorResponse("NOT_FOUND", `No product with id "${id}".`);
  return NextResponse.json({ product });
}

/** PATCH /api/products/:id (merchant only; needs the backend database) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyToBackend(req, `/api/products/${encodeURIComponent(id)}`);
  if (proxied) return proxied;
  return NextResponse.json({ error: { code: "SERVICE_UNAVAILABLE", message: "The store backend is unavailable." } }, { status: 503 });
}

/** DELETE /api/products/:id (merchant only; needs the backend database) */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyToBackend(req, `/api/products/${encodeURIComponent(id)}`);
  if (proxied) return proxied;
  return NextResponse.json({ error: { code: "SERVICE_UNAVAILABLE", message: "The store backend is unavailable." } }, { status: 503 });
}
