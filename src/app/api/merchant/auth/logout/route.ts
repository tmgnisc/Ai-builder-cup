import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * POST /api/merchant/auth/logout
 * Clears merchant session cookie and ends operations session.
 */
export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/auth/logout");
  if (proxied) return proxied;

  return NextResponse.json({ status: "ok", message: "Logged out." });
}
