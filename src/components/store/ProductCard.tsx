"use client";

import { Loader2, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { pip } from "@/components/companion/runtime";
import { StockBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatNPR, keySpecs } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { useCart } from "@/store/useCart";
import { useCatalogUI } from "@/store/useCatalogUI";
import { CompareToggle } from "./CompareToggle";
import { ProductImage } from "./ProductImage";

/**
 * Grid card: lift + cursor-following spotlight on hover, Pip glances at it, quick-add with
 * fly-to-cart, compare toggle, and a "Pip's pick" state when the agent highlights it.
 */
export function ProductCard({ product }: { product: Product }) {
  const ref = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const specs = keySpecs(product);
  const out = product.stock === 0;
  const rank = useCatalogUI((s) => s.highlighted.indexOf(product.id));
  const busy = useCart((s) => s.pending.includes(product.id));
  const addWithFeedback = useCart((s) => s.addWithFeedback);

  function onPointerMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <article
      ref={ref}
      data-product-id={product.id}
      data-flip-id={product.id}
      data-pip-anchor={`card:${product.id}`}
      data-pip-topic="product-card"
      data-pip-product={product.id}
      onPointerMove={onPointerMove}
      onPointerEnter={(e) => e.pointerType === "mouse" && ref.current && pip.glanceAtElement(ref.current, 1100)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 motion-reduce:hover:translate-y-0",
        rank >= 0
          ? "shadow-[inset_0_0_0_1.5px_var(--accent-text),0_0_0_4px_color-mix(in_oklab,var(--accent)_18%,transparent),0_24px_48px_-24px_rgb(0_0_0/0.6)]"
          : "hairline hover:shadow-[inset_0_0_0_1px_var(--border-strong),0_24px_48px_-24px_rgb(0_0_0/0.6)]",
      )}
    >
      {/* Cursor spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), var(--spotlight), transparent 45%)" }}
      />

      <div ref={imageRef} data-card-image className="relative aspect-[4/3] overflow-hidden">
        <ProductImage
          product={product}
          className={cn("transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]", out && "opacity-60 grayscale-[40%]")}
        />
      </div>

      <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-1.5">
          <StockBadge stock={product.stock} />
          {rank >= 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-2xs font-semibold text-accent-fg">
              <Sparkles className="size-3" aria-hidden /> Pip&apos;s pick #{rank + 1}
            </span>
          )}
        </div>
        <CompareToggle productId={product.id} productName={`${product.brand} ${product.name}`} />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs text-muted">{product.brand}</p>
          <h3 className="mt-0.5 line-clamp-1 font-display text-base font-medium tracking-tight">
            <Link href={`/product/${product.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {product.name}
            </Link>
          </h3>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {specs.map((s) => (
            <div key={s.key} className="min-w-0 rounded-lg bg-surface-2 px-2 py-1.5">
              <dt className="truncate text-2xs uppercase tracking-wider text-muted">{s.label}</dt>
              <dd className="truncate font-mono text-xs">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="font-mono text-lg font-semibold tabular">{formatNPR(product.price)}</p>
          <button
            type="button"
            disabled={out || busy}
            onClick={() => addWithFeedback(product.id, imageRef.current)}
            aria-label={out ? `${product.name} is out of stock` : `Add ${product.brand} ${product.name} to cart`}
            className="focus-ring relative z-10 grid size-9 place-items-center rounded-full bg-accent text-accent-fg transition-[filter,opacity] hover:brightness-110 disabled:bg-surface-2 disabled:text-muted"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Keyboard focus ring for the stretched link */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] group-has-[a:focus-visible]:outline group-has-[a:focus-visible]:outline-2 group-has-[a:focus-visible]:outline-accent-text"
      />
    </article>
  );
}
