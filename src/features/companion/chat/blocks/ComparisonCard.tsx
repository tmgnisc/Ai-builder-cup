"use client";

import { Maximize2, Trophy } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { getProduct } from "@/lib/commerce/catalog";
import { compareProducts, type CompareKey } from "@/lib/commerce/compare";
import type { Product } from "@/lib/commerce/schemas";
import { useCompare } from "@/store/useCompare";

/** Compact comparison inside the chat. Values come from the catalog via compareProducts, same as the drawer. */
export function ComparisonCard({
  productIds,
  verdict,
  winnerId,
  context,
  priorities,
}: {
  productIds: string[];
  verdict: string;
  winnerId: string | null;
  context?: string;
  priorities?: CompareKey[];
}) {
  const show = useCompare((s) => s.show);
  const products = productIds.map(getProduct).filter((p): p is Product => !!p);
  const rows = useMemo(() => compareProducts(products, { priorities, context }).rows.filter((r) => r.numeric && r.key !== "rating"), [products, priorities, context]);

  return (
    <div className="mt-2.5 overflow-hidden rounded-2xl bg-surface hairline">
      <div className="grid gap-2 px-3 pt-3" style={{ gridTemplateColumns: `72px repeat(${products.length}, minmax(0,1fr))` }}>
        <span />
        {products.map((p) => (
          <span key={p.id} className="min-w-0">
            <span className="flex items-center gap-1 truncate text-xs font-medium">
              {winnerId === p.id && <Trophy className="size-3 shrink-0 text-accent-text" aria-label="Better fit" />}
              <span className="truncate">{p.name}</span>
            </span>
          </span>
        ))}
      </div>
      <dl className="mt-1.5 px-3 pb-2">
        {rows.map((r) => (
          <div key={r.key} className="grid items-center gap-2 border-t border-border py-1" style={{ gridTemplateColumns: `72px repeat(${products.length}, minmax(0,1fr))` }}>
            <dt className="text-xs text-muted">{r.label}</dt>
            {products.map((p) => (
              <dd key={p.id} className={cn("truncate font-mono text-xs", r.winners.includes(p.id) && "font-semibold text-accent-text")}>
                {r.values[p.id]}
              </dd>
            ))}
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={() => show(productIds, { context, priorities })}
        className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-xs text-muted hover:bg-surface-2 hover:text-text"
        aria-label={`Open full comparison. ${verdict}`}
      >
        <Maximize2 className="size-3" aria-hidden /> Open full comparison
      </button>
    </div>
  );
}
