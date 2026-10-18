"use client";

import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/features/catalog";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Ticker } from "@/components/ui/Ticker";
import { getProduct } from "@/lib/commerce/catalog";
import { deliveryFor } from "@/lib/commerce/delivery";
import { formatNPR } from "@/lib/commerce/format";
import { track } from "@/lib/telemetry";
import { useCart } from "@/store/useCart";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Details {
  name: string;
  email: string;
  city: string;
}

function validate(d: Details): Partial<Record<keyof Details, string>> {
  const errors: Partial<Record<keyof Details, string>> = {};
  if (d.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!EMAIL.test(d.email.trim())) errors.email = "Enter a valid email address.";
  if (d.city.trim().length < 2) errors.city = "Enter a delivery city.";
  return errors;
}

export function CheckoutView() {
  const cart = useCart((s) => s.cart);
  const clear = useCart((s) => s.clear);
  const [details, setDetails] = useState<Details>({ name: "", email: "", city: "Kathmandu" });
  const [touched, setTouched] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lines = cart?.lines ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const delivery = deliveryFor(details.city || "Kathmandu");
  const fee = subtotal === 0 || subtotal >= delivery.freeOver ? 0 : delivery.fee;
  const errors = validate(details);
  const shownErrors = touched ? errors : {};

  // Counted once per visit to checkout with something in the cart.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || lines.length === 0) return;
    started.current = true;
    track("checkout_started", { items: lines.length, subtotal });
  }, [lines.length, subtotal]);

  const field = (key: keyof Details) => ({
    value: details[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDetails((d) => ({ ...d, [key]: e.target.value })),
    error: shownErrors[key],
  });

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (lines.length === 0 || submitting || Object.keys(errors).length > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: details.name.trim(),
          customerEmail: details.email.trim(),
          city: delivery.city,
          items: lines.map((l) => ({
            productId: l.productId,
            productName: l.name,
            quantity: l.qty,
            unitPrice: l.unitPrice,
          })),
          verifiedByPip: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "The store couldn't record this order.");
      }
      const data = await res.json();
      setOrderId(String(data.id ?? ""));
      track("order_placed", { orderId: String(data.id ?? ""), totalNPR: Number(data.totalNPR ?? 0) });
      await clear();
    } catch (err) {
      // Honest failure: the cart stays as it was, so the shopper can retry.
      setSubmitError(err instanceof Error ? err.message : "The store couldn't record this order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Keep shopping
      </Link>
      <h1 className="mt-4 page-title">{orderId ? "Order placed" : "Review your order"}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
        <ShieldCheck className="size-4 shrink-0 text-accent-text" aria-hidden /> Only you can place this order. Pip helps you shop but never pays or confirms for you.
      </p>

      {orderId ? (
        <div role="status" className="mt-8 flex flex-col items-center rounded-panel bg-surface p-10 text-center hairline">
          <CheckCircle2 className="size-8 text-listening" aria-hidden />
          <p className="mt-3 section-title">Order {orderId}</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            Thanks, {details.name.trim().split(" ")[0]}. The store has your order and delivers to {delivery.city} in {delivery.days}.
          </p>
          <Link href="/" className={buttonClasses({ variant: "secondary", size: "sm", className: "mt-6" })}>
            Continue shopping
          </Link>
        </div>
      ) : lines.length === 0 ? (
        <EmptyState
          className="mt-8 bg-surface hairline"
          icon={<ShoppingBag className="size-6" aria-hidden />}
          title="Your cart is empty"
          description="Add something from the store, or ask Pip to find it for you."
          action={
            <Link href="/" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Browse the store
            </Link>
          }
        />
      ) : (
        <form noValidate onSubmit={placeOrder} className="mt-8 grid items-start gap-6 md:grid-cols-checkout">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="items-heading" className="rounded-panel bg-surface hairline">
              <h2 id="items-heading" className="panel-title border-b border-border px-5 py-4">
                Items <span className="font-mono text-sm font-normal text-muted">({lines.reduce((n, l) => n + l.qty, 0)})</span>
              </h2>
              <ul className="divide-y divide-border">
                {lines.map((l) => {
                  const p = getProduct(l.productId);
                  return (
                    <li key={l.productId} className="flex items-center gap-4 px-5 py-4">
                      <div className="size-16 shrink-0 overflow-hidden rounded-xl hairline">
                        {p && <ProductImage product={p} variant="checkout" showInitials={false} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted">
                          {l.qty} × {formatNPR(l.unitPrice)}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-medium">{formatNPR(l.lineTotal)}</p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="delivery-heading" className="rounded-panel bg-surface p-5 hairline">
              <h2 id="delivery-heading" className="panel-title">
                Delivery details
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-muted">Full name</span>
                  <Input autoComplete="name" required {...field("name")} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-muted">Email</span>
                  <Input type="email" autoComplete="email" required {...field("email")} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                  <span className="text-muted">City</span>
                  <Input autoComplete="address-level2" required {...field("city")} />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted">
                {delivery.zone === "valley" ? "Express" : "Standard"} delivery to {delivery.city || "your city"}: {delivery.days}, free over {formatNPR(delivery.freeOver)}.
              </p>
            </section>
          </div>

          <aside data-pip-anchor="checkout-summary" data-pip-topic="checkout" className="rounded-panel bg-surface p-5 hairline md:sticky md:top-24">
            <h2 className="panel-title">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-mono">{formatNPR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="font-mono">{fee ? formatNPR(fee) : "Free"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-mono">
                  <span className="mr-1 text-xs font-normal text-muted">NPR</span>
                  <Ticker value={subtotal + fee} />
                </dd>
              </div>
            </dl>
            {submitError && (
              <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3 py-2 text-xs text-danger">
                {submitError} Your cart hasn&apos;t changed, so you can try again.
              </p>
            )}
            <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting} iconLeft={<Lock className="size-4" aria-hidden />}>
              {submitting ? "Placing order…" : "Place order"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted">No payment is taken online.</p>
          </aside>
        </form>
      )}
    </div>
  );
}
