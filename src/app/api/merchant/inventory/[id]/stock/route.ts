import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * PATCH /api/merchant/inventory/:id/stock
 * Updates product stock quantity in PostgreSQL products table.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxied = await proxyToBackend(req, `/api/merchant/inventory/${encodeURIComponent(id)}/stock`);
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Database backend is unavailable." } },
    { status: 503 }
  );
}
