import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/**
 * GET /api/orders
 * Proxies to FastAPI backend connected to PostgreSQL orders table.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const proxied = await proxyToBackend(req, `/api/orders${url.search}`);
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "The store backend is unavailable." } },
    { status: 503 },
  );
}

/**
 * POST /api/orders
 * Places a customer order and records it in PostgreSQL.
 */
export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/orders");
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "Database backend is unavailable." } },
    { status: 503 }
  );
}
