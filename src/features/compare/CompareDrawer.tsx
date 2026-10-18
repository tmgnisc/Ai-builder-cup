"use client";

import { Check, Loader2, Plus, Trophy, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

import { buttonClasses } from "@/components/ui/Button";
import { buildCompareUrl } from "@/lib/commerce/compareUrl";

/**
 * Bottom comparison drawer preview. Every value and the verdict come from `useCompareWinner`
 * over catalog data. Includes a direct action to open the full /compare workspace.
 */
export function CompareDrawer() {
  const pathname = usePathname();
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
      const tl = gsap.timeline({ delay: 0.25 });
      tl.from("[data-verdict]", { autoAlpha: 0, y: 12, duration: 0.6, ease: "expo.out" })
        .from(rows, { autoAlpha: 0, x: -14, duration: 0.5, ease: "expo.out", stagger: 0.05 }, 0.1);
    },
    { dependencies: [open, ids.join(",")], scope: tableRef, revertOnUpdate: true },
  );

  // When on the dedicated /compare workspace page, the full table is shown instead of this drawer.
  if (pathname === "/compare") return null;

  // Equal product columns with tokenized grid utilities (up to 4 products).
  const colsClass =
    products.length === 2
      ? "compare-grid-2"
      : products.length === 4
      ? "compare-grid-4"
      : "compare-grid-3";

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
              <p className="eyebrow text-accent-text">Pip&apos;s verdict</p>
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
                            "min-w-0 break-words rounded-md px-2 py-1 font-mono text-xs transition-colors",
                            win
                              ? "bg-accent/8 font-semibold text-accent-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_20%,transparent)]"
                              : "text-text",
                            !row.numeric && "text-xs leading-snug text-muted",
                          )}
                        >
                          {row.values[p.id]}
                          {win && (
                            <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
                              <Check className="size-3 text-accent-text" aria-hidden />
                              <span className="sr-only"> (best value)</span>
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-border/40 pt-4">
            <Link
              href={buildCompareUrl(ids)}
              onClick={() => setOpen(false)}
              className={buttonClasses({ variant: "primary", size: "md", className: "w-full" })}
            >
              Open full comparison workspace ({products.length} products)
            </Link>
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
    <div role="columnheader" className="relative flex min-w-0 flex-col gap-2">
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
        <Link href={`/product/${product.id}`} className="font-display text-sm font-medium hover:underline break-words">
          {product.name}
        </Link>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StockBadge stock={product.stock} className="whitespace-nowrap shrink-0" />
        <IconButton
          size="sm"
          variant="primary"
          disabled={out || busy}
          onClick={() => addWithFeedback(product.id, imgRef.current)}
          aria-label={out ? `${product.name} is out of stock` : `Add ${product.name} to cart (${formatNPR(product.price)})`}
          className="size-8 shrink-0"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
        </IconButton>
      </div>
    </div>
  );
}
