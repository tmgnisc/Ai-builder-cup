import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * GET /api/merchant/analytics
 * Funnel, top questions, friction and catalog gaps aggregated from shopper telemetry (backend only).
 */
export async function GET(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/analytics");
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "The store backend is unavailable." } },
    { status: 503 },
  );
}
