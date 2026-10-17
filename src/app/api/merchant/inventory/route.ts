import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * GET /api/merchant/inventory
 * Retrieves catalog inventory with stock levels and alert badges from PostgreSQL.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const proxied = await proxyToBackend(req, `/api/merchant/inventory${url.search}`);
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Database backend is unavailable." } },
    { status: 503 }
  );
}
