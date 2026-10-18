"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, motion, useGSAP } from "@/lib/motion";
import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { Ticker } from "@/components/ui/Ticker";
import { buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import { useCart } from "@/store/useCart";
import { ProductImage } from "@/features/catalog";

/**
 * Cart drawer. Opens modally from the header; after a verified add it "peeks" in non-modally
 * for ~2.4 s (hover holds it, clicking it opens it fully) and flashes the added line.
 */
export function CartDrawer() {
  const open = useCart((s) => s.drawerOpen);
  const peeking = useCart((s) => s.peeking);
  const holdPeek = useCart((s) => s.holdPeek);
  const lastAddedId = useCart((s) => s.lastAddedId);
  const listRef = useRef<HTMLUListElement>(null);
  const setOpen = useCart((s) => s.setDrawerOpen);
  const cart = useCart((s) => s.cart);
  const error = useCart((s) => s.error);
  const pending = useCart((s) => s.pending);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const lines = cart?.lines ?? [];

  useGSAP(
    () => {
      if (!lastAddedId || !(open || peeking)) return;
      const row = listRef.current?.querySelector<HTMLElement>(`[data-line="${lastAddedId}"]`);
      if (!row) return;
      gsap.fromTo(
        row,
        { backgroundColor: "color-mix(in oklab, var(--accent) 22%, transparent)" },
        { backgroundColor: "transparent", duration: motion.dur(1.4), ease: "power2.out", clearProps: "backgroundColor" },
      );
    },
    { dependencies: [lastAddedId, peeking, cart?.updatedAt] },
  );

  return (
    <Drawer
      open={open || peeking}
      modal={open}
      onOpenChange={setOpen}
      onPanelPointerEnter={peeking ? holdPeek : undefined}
      onPanelPointerDown={peeking ? () => setOpen(true) : undefined}
      title="Your cart"
      description={cart ? `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}` : "Loading…"}
      footer={
        <div>
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
          <Link
            href="/checkout"
            data-pip-anchor="checkout-button"
            data-pip-topic="checkout-button"
            onClick={() => setOpen(false)}
            aria-disabled={lines.length === 0}
            className={buttonClasses({ size: "lg", className: cn("mt-4 w-full", lines.length === 0 && "pointer-events-none opacity-45") })}
          >
            Review &amp; checkout
          </Link>
          <p className="mt-2 text-center text-xs text-muted">Items stay in your cart until you check out; stock is confirmed at checkout.</p>
        </div>
      }
    >
      <div className="flex h-full flex-col" data-pip-anchor="cart-drawer" data-pip-topic="cart-drawer">
        {lines.length === 0 ? (
          <div className="grid flex-1 place-items-center px-6 py-16 text-center">
            <EmptyState
              icon={<ShoppingBag className="size-6 text-muted" aria-hidden />}
              title="Your cart is empty"
              description="Tell Pip what you need or browse the catalog to add items."
            />
          </div>
        ) : (
          <ul ref={listRef} className="flex-1 divide-y divide-border px-3">
            {lines.map((line) => {
              const product = getProduct(line.productId);
              const busy = pending.includes(line.productId);
              return (
                <li key={line.productId} data-line={line.productId} className="flex gap-3 rounded-2xl px-2 py-4" aria-busy={busy}>
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
                      <IconButton
                        size="sm"
                        variant="secondary"
                        aria-label={`Decrease quantity of ${line.name}`}
                        disabled={busy}
                        onClick={() => setQty(line.productId, line.qty - 1)}
                        className="size-7"
                      >
                        <Minus className="size-3.5" />
                      </IconButton>
                      <span className="w-7 text-center font-mono text-sm tabular" aria-label={`Quantity ${line.qty}`}>
                        {line.qty}
                      </span>
                      <IconButton
                        size="sm"
                        variant="secondary"
                        aria-label={`Increase quantity of ${line.name}`}
                        disabled={busy || (product ? line.qty >= product.stock : false)}
                        onClick={() => setQty(line.productId, line.qty + 1)}
                        className="size-7"
                      >
                        <Plus className="size-3.5" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove ${line.name}`}
                        disabled={busy}
                        onClick={() => remove(line.productId)}
                        className="ml-auto size-7 text-muted hover:bg-danger/12 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </div>
                  </div>
                  <Ticker value={line.lineTotal} className="text-sm" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
