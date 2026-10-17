"use client";

import Link from "next/link";
import { BuyNowButton } from "@/features/cart";
import { formatNPR } from "@/lib/commerce/format";
import type { BundleBlock } from "@/lib/agent/types";
import { getProduct } from "@/lib/commerce/catalog";

/** A kit Pip put together (e.g. laptop + mouse + bag): every item with its price, the total, and Buy all. */
export function BundleCard({ block, interactive }: { block: BundleBlock; interactive: boolean }) {
  const unavailable = block.items.some((i) => (getProduct(i.productId)?.stock ?? 0) === 0);
  return (
    <div className="mt-2.5 rounded-xl bg-surface/70 p-2.5 hairline">
      <p className="text-xs font-medium">{block.title}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {block.items.map((item) => (
          <li key={`${item.slot}-${item.productId}`} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              <span className="text-muted">{item.slot}: </span>
              <Link href={`/product/${item.productId}`} className="hover:underline">
                {item.name}
              </Link>
            </span>
            <span className="shrink-0 font-mono tabular text-muted">{formatNPR(item.price)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="font-mono text-sm font-semibold tabular">{formatNPR(block.totalPrice)}</span>
        <BuyNowButton
          productIds={block.productIds}
          productName={block.title}
          label="Buy all"
          disabled={!interactive || unavailable}
        />
      </div>
      {unavailable && <p className="mt-1 text-2xs text-danger">One item is out of stock, so the set can&apos;t be bought together.</p>}
    </div>
  );
}
