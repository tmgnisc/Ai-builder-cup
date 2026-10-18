import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * GET /api/merchant/kpis
 * Store KPIs (database counts + shopper telemetry). Backend only: there is no local demo data.
 */
export async function GET(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/kpis");
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "The store backend is unavailable." } },
    { status: 503 },
  );
}
