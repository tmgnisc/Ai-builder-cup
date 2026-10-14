"use client";

import { useEffect } from "react";
import { useSignals } from "@/store/useSignals";

/** Records a product page view (each visit counts, so revisits are detectable). */
export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    useSignals.getState().record({ type: "view", productId, at: Date.now() });
  }, [productId]);
  return null;
}
