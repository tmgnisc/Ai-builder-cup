"use client";

import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProductImage } from "@/features/catalog";
import { Button } from "@/components/ui/Button";
import { Ticker } from "@/components/ui/Ticker";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import { useCart } from "@/store/useCart";

const DELIVERY_FEE = 100;
const FREE_OVER = 5000;

export function CheckoutView() {
  const cart = useCart((s) => s.cart);
  const [placed, setPlaced] = useState(false);
  const lines = cart?.lines ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const delivery = subtotal >= FREE_OVER || subtotal === 0 ? 0 : DELIVERY_FEE;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Keep shopping
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Review your order</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <ShieldCheck className="size-4 text-accent-text" aria-hidden /> Only you can place this order. Pip can help you shop, but never pays or confirms for you.
      </p>

      {placed ? (
        <div role="status" className="mt-8 rounded-[var(--radius-panel)] bg-surface p-8 text-center hairline">
          <p className="font-display text-xl font-semibold">Demo order confirmed</p>
          <p className="mt-2 text-sm text-muted">This is a demo store, so no payment was taken and nothing will ship.</p>
        </div>
      ) : lines.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-panel)] bg-surface p-8 text-center text-muted hairline">Your cart is empty.</div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_300px]">
          <ul className="divide-y divide-border rounded-[var(--radius-panel)] bg-surface hairline">
            {lines.map((l) => {
              const p = getProduct(l.productId);
              return (
                <li key={l.productId} className="flex items-center gap-4 p-4">
                  <div className="size-16 overflow-hidden rounded-xl">{p && <ProductImage product={p} variant="checkout" showInitials={false} />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="font-mono text-xs text-muted">
                      {l.qty} × {formatNPR(l.unitPrice)}
                    </p>
                  </div>
                  <p className="font-mono text-sm">{formatNPR(l.lineTotal)}</p>
                </li>
              );
            })}
          </ul>
          <aside data-pip-anchor="checkout-summary" data-pip-topic="checkout" className="h-fit rounded-[var(--radius-panel)] bg-surface p-5 hairline">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-mono">{formatNPR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery (Kathmandu valley)</dt>
                <dd className="font-mono">{delivery ? formatNPR(delivery) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>
                  <span className="mr-1 font-mono text-xs text-muted">NPR</span>
                  <Ticker value={subtotal + delivery} />
                </dd>
              </div>
            </dl>
            <Button size="lg" className="mt-5 w-full" onClick={() => setPlaced(true)}>
              <Lock className="size-4" aria-hidden /> Place order
            </Button>
            <p className="mt-2 text-center text-xs text-muted">Demo only. No payment is taken.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
