"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { Ticker } from "@/components/ui/Ticker";
import { buttonClasses } from "@/components/ui/Button";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import { useCart } from "@/store/useCart";
import { ProductImage } from "./ProductImage";

/** Phase 1: functional cart sheet. Phase 3 adds fly-to-cart, peek and richer motion. */
export function CartDrawer() {
  const open = useCart((s) => s.drawerOpen);
  const setOpen = useCart((s) => s.setDrawerOpen);
  const cart = useCart((s) => s.cart);
  const error = useCart((s) => s.error);
  const pending = useCart((s) => s.pending);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const lines = cart?.lines ?? [];

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Your cart"
      description={cart ? `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}` : "Loading…"}
    >
      <div className="flex h-full flex-col">
        {lines.length === 0 ? (
          <div className="grid flex-1 place-items-center px-6 py-16 text-center">
            <div>
              <ShoppingBag className="mx-auto size-8 text-muted" aria-hidden />
              <p className="mt-3 text-sm text-muted">Your cart is empty. Ask Pip to find something.</p>
            </div>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-border px-5">
            {lines.map((line) => {
              const product = getProduct(line.productId);
              const busy = pending.includes(line.productId);
              return (
                <li key={line.productId} className="flex gap-3 py-4" aria-busy={busy}>
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                    {product && <ProductImage product={product} variant="cart" showInitials={false} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${line.productId}`}
                      onClick={() => setOpen(false)}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted">{formatNPR(line.unitPrice)}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${line.name}`}
                        disabled={busy}
                        onClick={() => setQty(line.productId, line.qty - 1)}
                        className="grid size-7 place-items-center rounded-full hairline text-muted hover:text-text disabled:opacity-40"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-7 text-center font-mono text-sm tabular" aria-label={`Quantity ${line.qty}`}>
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${line.name}`}
                        disabled={busy || (product ? line.qty >= product.stock : false)}
                        onClick={() => setQty(line.productId, line.qty + 1)}
                        className="grid size-7 place-items-center rounded-full hairline text-muted hover:text-text disabled:opacity-40"
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${line.name}`}
                        disabled={busy}
                        onClick={() => remove(line.productId)}
                        className="ml-auto grid size-7 place-items-center rounded-full text-muted hover:bg-danger/12 hover:text-danger disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="font-mono text-sm tabular">{formatNPR(line.lineTotal, { prefix: false })}</p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="sticky bottom-0 border-t border-border bg-surface/60 px-5 py-4">
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-danger/12 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Subtotal</span>
            <span className="text-xl font-semibold">
              <span className="mr-1 font-mono text-xs text-muted">NPR</span>
              <Ticker value={cart?.subtotal ?? 0} />
            </span>
          </div>
          <button
            type="button"
            disabled={lines.length === 0}
            className={buttonClasses({ size: "lg", className: "mt-4 w-full" })}
            title="Checkout arrives in a later phase"
          >
            Review &amp; checkout
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">You always confirm purchases yourself. Pip can&apos;t check out for you.</p>
        </div>
      </div>
    </Sheet>
  );
}
