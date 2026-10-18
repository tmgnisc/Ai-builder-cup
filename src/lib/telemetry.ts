/**
 * Shopper telemetry for the merchant dashboard. Every number on /merchant that isn't an order or
 * stock count is aggregated server-side from these events (backend/app/services/analytics.py).
 *
 * Fire-and-forget: tracking never blocks or breaks the storefront. Events carry an anonymous
 * per-browser id, product ids and short strings only, never personal details.
 */

export type TelemetryKind =
  | "visit"
  | "pip_message"
  | "recommendation"
  | "compare"
  | "cart_verified"
  | "cart_failed"
  | "checkout_started"
  | "order_placed"
  | "tip_shown"
  | "tip_engaged"
  | "friction"
  | "missing_info";

type TelemetryData = Record<string, string | number | boolean | string[] | undefined>;

const SESSION_KEY = "persona_telemetry_sid";
const VISIT_KEY = "persona_telemetry_visit";

let memorySessionId: string | null = null;

function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `s_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Anonymous browser-session id; falls back to an in-memory id when storage is blocked. */
export function telemetrySessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    memorySessionId ??= randomId();
    return memorySessionId;
  }
}

export function track(kind: TelemetryKind, data?: TelemetryData): void {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") return;
  // The merchant portal is staff, not shoppers.
  if (window.location.pathname.startsWith("/merchant")) return;
  const body = JSON.stringify({ sessionId: telemetrySessionId(), kind, data });
  try {
    void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // Telemetry must never surface to the shopper.
  }
}

/** Counts one store visit per browser session. */
export function trackVisit(): void {
  try {
    if (sessionStorage.getItem(VISIT_KEY)) return;
    sessionStorage.setItem(VISIT_KEY, "1");
  } catch {
    // Storage blocked: still count it (at most once per page load, see ClientBootstrap).
  }
  track("visit", { path: window.location.pathname });
}

/** Human page name for friction reports ("Checkout", "Product", ...). */
export function pageName(path: string): string {
  if (path.startsWith("/product")) return "Product";
  if (path.startsWith("/compare")) return "Compare";
  if (path.startsWith("/checkout")) return "Checkout";
  return "Store";
}
