"use client";

import { Check, Loader2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/store/useCart";

/** Product-page add button: verified add, then fly the gallery image into the cart. */
export function AddToCartButton({ productId, disabled, sourceSelector = "[data-gallery-main]", className }: { productId: string; disabled?: boolean; sourceSelector?: string; className?: string }) {
  const addWithFeedback = useCart((s) => s.addWithFeedback);
  const busy = useCart((s) => s.pending.includes(productId));
  const error = useCart((s) => s.error);
  const [justAdded, setJustAdded] = useState(false);

  async function onClick() {
    const ok = await addWithFeedback(productId, document.querySelector(sourceSelector));
    if (ok) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1800);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" variant={disabled ? "secondary" : "primary"} onClick={onClick} disabled={disabled || busy} className={className}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : justAdded ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <ShoppingBag className="size-4" aria-hidden />
        )}
        {disabled ? "Out of stock" : busy ? "Adding…" : justAdded ? "Added & verified" : "Add to cart"}
      </Button>
      <p aria-live="polite" className="sr-only">
        {justAdded ? "Added to cart and verified." : ""}
      </p>
      {error && !busy && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
