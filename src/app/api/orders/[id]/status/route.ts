import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * PATCH /api/orders/:id/status
 * Updates order fulfillment status in PostgreSQL.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyToBackend(req, `/api/orders/${encodeURIComponent(id)}/status`);
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Database backend is unavailable." } },
    { status: 503 }
  );
}
