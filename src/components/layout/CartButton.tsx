"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/useCart";

export function CartButton() {
  const count = useCart((s) => s.cart?.itemCount ?? 0);
  const open = useCart((s) => s.setDrawerOpen);
  return (
    <button
      type="button"
      id="cart-button"
      data-cart-target
      data-pip-anchor="cart-button"
      data-pip-topic="cart"
      onClick={() => open(true)}
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      className="focus-ring relative grid size-10 place-items-center rounded-full text-text transition-colors hover:bg-surface-2"
    >
      <ShoppingBag className="size-4.5" />
      {count > 0 && (
        <span
          aria-hidden
          className="tabular absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 font-mono text-2xs font-bold text-accent-fg"
        >
          {count}
        </span>
      )}
    </button>
  );
}
