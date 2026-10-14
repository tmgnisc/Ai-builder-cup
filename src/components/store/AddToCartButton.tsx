"use client";

import { Check, Loader2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { useCart } from "@/store/useCart";

export function AddToCartButton({ productId, disabled }: { productId: string; disabled?: boolean }) {
  const add = useCart((s) => s.add);
  const busy = useCart((s) => s.pending.includes(productId));
  const error = useCart((s) => s.error);
  const [justAdded, setJustAdded] = useState(false);

  async function onClick() {
    const cart = await add(productId, 1);
    if (cart?.lines.some((l) => l.productId === productId)) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <MagneticButton size="lg" variant={disabled ? "secondary" : "primary"} onClick={onClick} disabled={disabled || busy} aria-live="polite">
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : justAdded ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <ShoppingBag className="size-4" aria-hidden />
        )}
        {disabled ? "Out of stock" : busy ? "Adding…" : justAdded ? "Added" : "Add to cart"}
      </MagneticButton>
      {error && !busy && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
