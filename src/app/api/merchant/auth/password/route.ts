import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";

/** POST /api/merchant/auth/password: change the signed-in merchant's password. */
export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/auth/password");
  if (proxied) return proxied;

  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "The store backend is unavailable." } },
    { status: 503 },
  );
}
