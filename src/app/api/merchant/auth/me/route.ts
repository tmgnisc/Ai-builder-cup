import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * GET /api/merchant/auth/me
 * Retrieves current authenticated merchant profile from backend.
 */
export async function GET(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/auth/me");
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Merchant authentication backend is unavailable." } },
    { status: 503 }
  );
}
