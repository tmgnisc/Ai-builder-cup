import { NextResponse } from "next/server";
import { getSessionId, SESSION_COOKIE } from "@/lib/commerce/http";

export function getBackendUrl(): string | null {
  const url = process.env.BACKEND_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

/**
 * Local fallbacks (in-process cart, mockAgent) are a dev convenience only. In production a configured
 * backend is the single source of truth: falling back would split carts across two stores.
 */
export function allowLocalFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function backendUnavailable(): Response {
  return NextResponse.json(
    { error: { code: "TRANSIENT", message: "The store service is unavailable. Please try again." } },
    { status: 503 },
  );
}

/**
 * Proxies an incoming Next.js API request to the Python FastAPI backend when BACKEND_URL is configured.
 * Forwards persona_sid cookie, headers, query parameters, body, and returns response with Set-Cookie forwarded.
 * Returns null when no backend is configured, or (dev only) when it fails to respond, so the caller can fall back.
 */
export async function proxyToBackend(
  req: Request,
  targetPath: string,
): Promise<Response | null> {
  const backendBase = getBackendUrl();
  if (!backendBase) return null;

  try {
    const incomingUrl = new URL(req.url);
    const targetUrl = new URL(targetPath, backendBase);

    // Forward all search query parameters
    incomingUrl.searchParams.forEach((val, key) => {
      targetUrl.searchParams.set(key, val);
    });

    const sessionId = await getSessionId(req);

    const headers = new Headers();
    const incomingCookie = req.headers.get("cookie") ?? "";
    if (!incomingCookie.includes(SESSION_COOKIE)) {
      headers.set(
        "cookie",
        incomingCookie ? `${incomingCookie}; ${SESSION_COOKIE}=${sessionId}` : `${SESSION_COOKIE}=${sessionId}`,
      );
    } else {
      headers.set("cookie", incomingCookie);
    }

    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    if (process.env.ALLOW_CHAOS_HEADERS === "1") {
      const chaosHeader = req.headers.get("x-persona-chaos");
      if (chaosHeader) headers.set("x-persona-chaos", chaosHeader);

      const latencyHeader = req.headers.get("x-persona-latency");
      if (latencyHeader) headers.set("x-persona-latency", latencyHeader);
    }

    // Shared-secret authentication (Step 0d)
    if (process.env.AGENT_SHARED_SECRET) {
      headers.set("x-agent-shared-secret", process.env.AGENT_SHARED_SECRET);
    }

    const method = req.method;
    let body: BodyInit | null = null;
    if (method !== "GET" && method !== "HEAD") {
      body = await req.clone().arrayBuffer();
    }

    const backendResp = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      signal: req.signal,
    });

    const respHeaders = new Headers();
    const respContentType = backendResp.headers.get("content-type");
    if (respContentType) respHeaders.set("content-type", respContentType);

    // Forward Set-Cookie both ways
    if (typeof backendResp.headers.getSetCookie === "function") {
      for (const cookie of backendResp.headers.getSetCookie()) {
        respHeaders.append("set-cookie", cookie);
      }
    } else {
      const setCookie = backendResp.headers.get("set-cookie");
      if (setCookie) respHeaders.set("set-cookie", setCookie);
    }

    return new NextResponse(backendResp.body, {
      status: backendResp.status,
      headers: respHeaders,
    });
  } catch (err) {
    console.warn(`[backendProxy] failed to proxy to ${targetPath}:`, err);
    return allowLocalFallback() ? null : backendUnavailable();
  }
}
