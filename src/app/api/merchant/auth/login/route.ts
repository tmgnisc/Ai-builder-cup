import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * POST /api/merchant/auth/login
 * Proxies merchant login credentials to backend FastAPI service.
 */
export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/auth/login");
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Merchant authentication backend is unavailable." } },
    { status: 503 }
  );
}
