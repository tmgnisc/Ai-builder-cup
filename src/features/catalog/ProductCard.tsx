"use client";

import { AlertCircle, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { pip } from "@/features/companion";
import { StockBadge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { formatNPR, keySpecs } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { useCart } from "@/store/useCart";
import { useCatalogUI } from "@/store/useCatalogUI";
import { CompareToggle } from "@/features/compare";
import { ProductImage } from "./ProductImage";

function formatSpecSummary(product: Product): string {
  const specs = keySpecs(product);
  return specs
    .map((s) => {
      if (s.key === "anc") return s.value === "Yes" ? "ANC" : "Passive";
      return s.value;
    })
    .join(" · ");
}

/**
 * Grid card: lift + cursor-following spotlight on hover, Pip glances at it, quick-add with
 * fly-to-cart, compare toggle, and a "Pip's pick" state when the agent highlights it.
 */
export function ProductCard({ product }: { product: Product }) {
  const ref = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const out = product.stock === 0;
  const rank = useCatalogUI((s) => s.highlighted.indexOf(product.id));
  const busy = useCart((s) => s.pending.includes(product.id));
  const addWithFeedback = useCart((s) => s.addWithFeedback);
  const [justAdded, setJustAdded] = useState(false);
  const [addFailed, setAddFailed] = useState(false);

  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (out || busy) return;
    setAddFailed(false);
    const ok = await addWithFeedback(product.id, imageRef.current);
    if (ok) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1800);
    } else {
      setAddFailed(true);
      window.setTimeout(() => setAddFailed(false), 2400);
    }
  }

  const quickAddLabel = out
    ? `${product.brand} ${product.name} is out of stock`
    : busy
      ? `Adding ${product.name} to cart…`
      : justAdded
        ? `Added ${product.name} to cart and verified`
        : addFailed
          ? `Failed to add ${product.name}. Click to retry.`
          : `Add ${product.brand} ${product.name} to cart`;

  const quickAddTooltip = out
    ? "Out of stock"
    : busy
      ? "Adding to cart…"
      : justAdded
        ? "Added & verified"
        : addFailed
          ? "Failed to add. Click to retry."
          : "Add to cart";

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
        "group relative flex flex-col h-full overflow-hidden rounded-card bg-surface transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 motion-reduce:hover:translate-y-0",
        rank >= 0
          ? "shadow-[inset_0_0_0_1.5px_var(--accent-text),0_0_0_4px_color-mix(in_oklab,var(--accent)_18%,transparent),0_24px_48px_-24px_var(--overlay)]"
          : "hairline hover:shadow-[inset_0_0_0_1px_var(--border-strong),0_24px_48px_-24px_var(--overlay)]",
      )}
    >
      {/* Cursor spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-base opacity-0 transition-opacity duration-300 group-hover:opacity-100"
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
            <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-2xs font-semibold text-accent-fg">
              Pip&apos;s pick #{rank + 1}
            </span>
          )}
        </div>
        <CompareToggle productId={product.id} productName={`${product.brand} ${product.name}`} />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted">{product.brand}</p>
          <h3 className="mt-0.5 line-clamp-1 font-display text-base font-medium tracking-tight">
            <Link href={`/product/${product.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 font-mono text-xs text-muted">
            {formatSpecSummary(product)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="font-mono text-base font-semibold tabular">{formatNPR(product.price)}</p>
          <div className="relative z-10">
            <Tooltip content={quickAddTooltip} side="top">
              <IconButton
                size="sm"
                variant={addFailed ? "outline" : justAdded ? "secondary" : "primary"}
                disabled={out || busy}
                loading={busy}
                onClick={handleQuickAdd}
                aria-label={quickAddLabel}
                className={cn(
                  addFailed && "border-danger text-danger hover:border-danger hover:text-danger",
                  justAdded && "bg-listening/15 text-listening hover:bg-listening/20",
                )}
              >
                {justAdded ? (
                  <Check className="size-4" aria-hidden />
                ) : addFailed ? (
                  <AlertCircle className="size-4" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {justAdded
          ? `Added ${product.name} to cart and verified.`
          : addFailed
            ? `Failed to add ${product.name} to cart.`
            : ""}
      </p>

      {/* Keyboard focus ring for the stretched link */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-inherit group-has-[a:focus-visible]:outline group-has-[a:focus-visible]:outline-2 group-has-[a:focus-visible]:outline-accent-text"
      />
    </article>
  );
}
