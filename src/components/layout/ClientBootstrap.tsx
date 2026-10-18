"use client";

import { useEffect } from "react";
import { setClientChaos } from "@/lib/commerce/client";
import { trackVisit } from "@/lib/telemetry";
import { useCart } from "@/store/useCart";

/** One-time client setup: pick up `?chaos=` for the session, load the server cart, count the visit. */
export function ClientBootstrap() {
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("chaos");
    let value = raw;
    try {
      if (raw !== null) sessionStorage.setItem("persona-chaos", raw);
      else value = sessionStorage.getItem("persona-chaos");
    } catch {
      // storage unavailable (private mode): chaos applies to this page load only
    }
    const rate = value === null ? NaN : Number(value);
    if (Number.isFinite(rate)) setClientChaos(rate);
    void useCart.getState().refresh();
    trackVisit();
  }, []);

  return null;
}
