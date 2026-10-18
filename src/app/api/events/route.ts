import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * POST /api/events
 * Shopper telemetry, stored by the backend for the merchant dashboard. Without a backend the
 * event is dropped (there is nowhere to aggregate it).
 */
export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/events");
  if (proxied) return proxied;

  return NextResponse.json({ accepted: false }, { status: 202 });
}
