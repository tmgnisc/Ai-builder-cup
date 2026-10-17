"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { BuyNowButton } from "@/features/cart";
import { ProductImage } from "@/features/catalog";
import type { BundleBlock } from "@/lib/agent/types";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import { useCatalogUI } from "@/store/useCatalogUI";

/**
 * A package Scout put together (e.g. laptop + headphones): every slot with its product, the total,
 * "Add package to cart" (each item verified, stay here) and "Buy all" (then checkout).
 * Clicking an item highlights it in the grid and opens its page.
 */
export function BundleCard({ block, interactive }: { block: BundleBlock; interactive: boolean }) {
  const setHighlighted = useCatalogUI((s) => s.setHighlighted);
  const unavailable = block.items.some((i) => (getProduct(i.productId)?.stock ?? 0) === 0);
  const disabled = !interactive || unavailable;
  return (
    <div className="mt-2.5 rounded-xl bg-surface/70 p-2.5 hairline">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium">
          <Package className="size-3.5 shrink-0 text-accent-text" aria-hidden />
          <span className="truncate">{block.title}</span>
        </p>
        <span className="shrink-0 rounded-md bg-accent/12 px-2 py-0.5 font-mono text-2xs font-semibold tabular text-accent-text">
          {formatNPR(block.totalPrice)}
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {block.items.map((item) => {
          const p = getProduct(item.productId);
          return (
            <li key={`${item.slot}-${item.productId}`}>
              <Link
                href={`/product/${item.productId}`}
                onClick={() => setHighlighted(block.productIds)}
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-2"
              >
                <span className="size-9 shrink-0 overflow-hidden rounded-md">
                  {p && <ProductImage product={p} variant={`bundle-${block.id}-${item.productId}`} showInitials={false} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xs uppercase tracking-wide text-muted">{item.slot}</span>
                  <span className="block truncate text-xs font-medium">{item.name}</span>
                </span>
                <span className="shrink-0 font-mono text-xs tabular text-muted">{formatNPR(item.price)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-border pt-2">
        <BuyNowButton productIds={block.productIds} productName={block.title} label="Add package to cart" then="stay" disabled={disabled} />
        <BuyNowButton productIds={block.productIds} productName={block.title} label="Buy all" disabled={disabled} />
      </div>
      {unavailable && <p className="mt-1 text-2xs text-danger">One item is out of stock, so the package can&apos;t be bought together.</p>}
    </div>
  );
}
