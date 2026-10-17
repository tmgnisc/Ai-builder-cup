import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";
import { INITIAL_ORDERS } from "@/data/merchantOrders";

/**
 * GET /api/orders/:id
 * Retrieves order details.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyToBackend(req, `/api/orders/${encodeURIComponent(id)}`);
  if (proxied) return proxied;

  const found = INITIAL_ORDERS.find((o) => o.id === id);
  if (!found) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: `Order ${id} not found.` } }, { status: 404 });
  }
  return NextResponse.json(found);
}

/**
 * DELETE /api/orders/:id
 * Cancels or deletes order from PostgreSQL.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyToBackend(req, `/api/orders/${encodeURIComponent(id)}`);
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Database backend is unavailable." } },
    { status: 503 }
  );
}
