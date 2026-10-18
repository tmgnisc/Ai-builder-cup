import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/commerce/catalog";
import { resolveChaos, rollFailure, simulateLatency } from "@/lib/commerce/chaos";
import { errorResponse, transientError } from "@/lib/commerce/http";
import { parseProductQuery } from "@/lib/commerce/query";
import { proxyToBackend } from "@/lib/server/backendProxy";

/** GET /api/products?q=&category=&brand=&minPrice=&maxPrice=&minRam=&minBattery=&maxWeight=&tag=&inStock=1&sort=&limit= */
export async function GET(req: Request) {
  const proxied = await proxyToBackend(req, "/api/products");
  if (proxied) return proxied;

  const started = performance.now();
  const parsed = parseProductQuery(new URL(req.url).searchParams);
  if (!parsed.success) {
    return errorResponse("INVALID_INPUT", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }

  const chaos = resolveChaos(req);
  await simulateLatency(chaos);
  if (rollFailure(chaos, { mutation: false })) return transientError();

  const result = searchProducts(parsed.data);
  return NextResponse.json({ ...result, tookMs: Math.round(performance.now() - started) });
}

/** POST /api/products: creates a new product in the store */
export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/api/products");
  if (proxied) return proxied;

  try {
    const body = await req.json();
    return NextResponse.json({ product: body }, { status: 201 });
  } catch {
    return errorResponse("INVALID_INPUT", "Malformed JSON body in product creation request.");
  }
}

