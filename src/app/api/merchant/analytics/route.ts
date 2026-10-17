import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backendProxy";
import { FRICTION, FUNNEL, TOP_QUESTIONS } from "@/data/merchant";

/**
 * GET /api/merchant/analytics
 * Retrieves funnel progression, inquiries, and friction analytics.
 */
export async function GET(req: Request) {
  const proxied = await proxyToBackend(req, "/api/merchant/analytics");
  if (proxied) return proxied;

  return NextResponse.json({
    period: "Last 7 days",
    funnel: FUNNEL,
    topQuestions: TOP_QUESTIONS,
    frictionThemes: FRICTION,
  });
}
