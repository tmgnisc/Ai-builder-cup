"use client";

import { Loader2, Plus, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { StockBadge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { formatNPR } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import type { CompareRow } from "@/lib/commerce/compare";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { useCart } from "@/store/useCart";
import { useBubble } from "@/store/useBubble";
import { useCompare } from "@/store/useCompare";
import { useCompareWinner } from "@/hooks/useCompareWinner";
import { ProductImage } from "@/features/catalog";

/**
 * Bottom comparison drawer. Every value and the verdict come from `useCompareWinner`
 * over catalog data. Rows reveal in sequence; winning cells flash lime.
 */
export function CompareDrawer() {
  const ids = useCompare((s) => s.ids);
  const open = useCompare((s) => s.open);
  const setOpen = useCompare((s) => s.setOpen);
  const remove = useCompare((s) => s.remove);
  const context = useCompare((s) => s.context);
  const priorities = useCompare((s) => s.priorities);
  const tableRef = useRef<HTMLDivElement>(null);
  // While Pip is talking, the drawer is non-modal so the bubble stays usable.
  const pipTalking = useBubble((s) => s.content !== null);

  const { products, result, isWinner, isRowWinner, verdict } = useCompareWinner(ids, {
    context,
    priorities,
  });

  useGSAP(
    () => {
      if (!open || !tableRef.current || motion.reduced) return;
      const rows = tableRef.current.querySelectorAll("[data-row]");
      const winners = tableRef.current.querySelectorAll("[data-winner]");
      const tl = gsap.timeline({ delay: 0.25 });
      tl.from("[data-verdict]", { autoAlpha: 0, y: 12, duration: 0.6, ease: "expo.out" })
        .from(rows, { autoAlpha: 0, x: -14, duration: 0.5, ease: "expo.out", stagger: 0.06 }, 0.1)
        .fromTo(
          winners,
          { backgroundColor: "color-mix(in oklab, var(--accent) 45%, transparent)" },
          { backgroundColor: "color-mix(in oklab, var(--accent) 12%, transparent)", duration: 0.9, ease: "power2.out", stagger: 0.06 },
          0.35,
        );
    },
    { dependencies: [open, ids.join(",")], scope: tableRef, revertOnUpdate: true },
  );

  // Equal product columns with tokenized grid utilities.
  const colsClass = products.length === 2 ? "compare-grid-2" : "compare-grid-3";

  return (
    <Drawer
      open={open && !!result}
      onOpenChange={setOpen}
      side="bottom"
      modal={!pipTalking}
      title="Compare"
      description={context ? `For ${context}` : `${products.length} products side by side · values from the catalog`}
    >
      {result && (
        <div ref={tableRef} className="px-5 pb-6 pt-4">
          <div data-verdict data-pip-anchor="compare-verdict" data-pip-topic="compare-verdict" className="flex gap-3 rounded-2xl bg-accent/10 p-4 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_30%,transparent)]">
            <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-bg shadow-[inset_0_0_0_1.5px_var(--accent),0_0_16px_-4px_var(--accent)]">
              <span className="flex gap-0.5">
                <span className="h-2 w-0.5 rounded-full bg-text" />
                <span className="h-2 w-0.5 rounded-full bg-text" />
              </span>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">Pip&apos;s verdict</p>
              <p className="mt-1 text-sm leading-relaxed">{verdict}</p>
            </div>
          </div>

          <div className="no-scrollbar mt-5 overflow-x-auto">
            <div role="table" aria-label="Product comparison" className="w-full">
              <div role="row" className={cn("grid items-end gap-3 px-3 pb-3", colsClass)}>
                <span role="columnheader">
                  <span className="sr-only">Attribute</span>
                </span>
                {products.map((p) => (
                  <ProductHeader key={p.id} product={p} isWinner={isWinner(p.id)} onRemove={() => remove(p.id)} />
                ))}
              </div>
              <div role="rowgroup" className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-2/60 hairline">
                {result.rows.map((row: CompareRow) => (
                  <div key={row.key} role="row" data-row className={cn("grid items-center gap-3 px-3 py-2.5 odd:bg-surface/40", colsClass)}>
                    <span role="rowheader" className="text-xs text-muted">
                      {row.label}
                    </span>
                    {products.map((p) => {
                      const win = isRowWinner(row.key, p.id);
                      return (
                        <span
                          key={p.id}
                          role="cell"
                          data-winner={win ? "" : undefined}
                          className={cn(
                            "min-w-0 break-words rounded-lg px-2 py-1 font-mono text-xs",
                            win && "bg-accent/12 font-semibold text-accent-text",
                            !row.numeric && "text-xs leading-snug text-muted",
                          )}
                        >
                          {row.values[p.id]}
                          {win && <span className="sr-only"> (best)</span>}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function ProductHeader({ product, isWinner, onRemove }: { product: Product; isWinner: boolean; onRemove: () => void }) {
  const imgRef = useRef<HTMLDivElement>(null);
  const addWithFeedback = useCart((s) => s.addWithFeedback);
  const busy = useCart((s) => s.pending.includes(product.id));
  const out = product.stock === 0;
  return (
    <div role="columnheader" className="relative flex min-w-0 compare-col flex-col gap-2">
      <div ref={imgRef} className="relative h-28 overflow-hidden rounded-xl hairline">
        <ProductImage product={product} variant="compare" />
        {isWinner && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-2xs font-semibold text-accent-fg">
            <Trophy className="size-3" aria-hidden /> Better fit
          </span>
        )}
        <IconButton
          size="sm"
          variant="secondary"
          onClick={onRemove}
          aria-label={`Remove ${product.name} from comparison`}
          className="absolute right-2 top-2 size-7 bg-black/45 text-white backdrop-blur hover:bg-black/65"
        >
          <X className="size-3.5" />
        </IconButton>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{product.brand}</p>
        <Link href={`/product/${product.id}`} className="line-clamp-1 font-display text-sm font-medium hover:underline">
          {product.name}
        </Link>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StockBadge stock={product.stock} />
        <IconButton
          size="sm"
          variant="primary"
          disabled={out || busy}
          onClick={() => addWithFeedback(product.id, imgRef.current)}
          aria-label={out ? `${product.name} is out of stock` : `Add ${product.name} to cart (${formatNPR(product.price)})`}
          className="size-8"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
        </IconButton>
      </div>
    </div>
  );
}
