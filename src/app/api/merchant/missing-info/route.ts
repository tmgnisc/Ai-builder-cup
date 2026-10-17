import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";
import { MISSING_INFO } from "@/data/merchant";

/**
 * GET /api/merchant/missing-info
 * Retrieves missing specification requests.
 */
export async function GET(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/missing-info");
  if (proxied) return proxied;

  return NextResponse.json(MISSING_INFO);
}

/**
 * POST /api/merchant/missing-info
 * Records a new specification gap.
 */
export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/missing-info");
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Database backend is unavailable." } },
    { status: 503 }
  );
}
