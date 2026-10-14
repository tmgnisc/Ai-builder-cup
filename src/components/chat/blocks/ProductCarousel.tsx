"use client";

import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { CompareToggle } from "@/components/store/CompareToggle";
import { ProductImage } from "@/components/store/ProductImage";
import { StockBadge } from "@/components/ui/Badge";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR, keySpecs } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { useChat } from "@/store/useChat";

/** Horizontal strip of mini product cards. "Add" goes through Pip so it's verified like any agent action. */
export function ProductCarousel({ productIds, title, interactive }: { productIds: string[]; title?: string; interactive: boolean }) {
  const send = useChat((s) => s.send);
  const products = productIds.map(getProduct).filter((p): p is Product => !!p);

  return (
    <div className="mt-2.5">
      {title && <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">{title}</p>}
      <ul className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {products.map((p, i) => (
          <li key={p.id} className="w-[176px] shrink-0 snap-start overflow-hidden rounded-2xl bg-surface hairline">
            <div data-chat-product={p.id} className="relative h-24">
              <ProductImage product={p} variant={`chat-${i}`} showInitials={false} className={p.stock === 0 ? "grayscale-[40%] opacity-70" : undefined} />
              {productIds.length > 1 && (
                <span className="absolute left-2 top-2 grid size-5 place-items-center rounded-full bg-black/50 font-mono text-[10px] font-bold text-white backdrop-blur">
                  {i + 1}
                </span>
              )}
              <CompareToggle productId={p.id} productName={p.name} className="absolute right-1.5 top-1.5 size-7 [&_svg]:size-3.5" />
            </div>
            <div className="p-2.5">
              <p className="truncate text-[10px] text-muted">{p.brand}</p>
              <p className="truncate text-[13px] font-medium">{p.name}</p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                {keySpecs(p)
                  .slice(0, 2)
                  .map((s) => (s.value === "Yes" ? s.label : s.value))
                  .join(" · ")}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold">{formatNPR(p.price)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <StockBadge stock={p.stock} className="!px-2 !py-0.5 !text-[10px]" />
                <div className="flex gap-1">
                  <Link
                    href={`/product/${p.id}`}
                    aria-label={`View ${p.name}`}
                    className="grid size-7 place-items-center rounded-full text-muted hairline hover:text-text"
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                  <button
                    type="button"
                    disabled={!interactive || p.stock === 0}
                    onClick={() => send(`Add the ${p.name} to my cart`)}
                    aria-label={`Ask Pip to add the ${p.name} to the cart`}
                    className="grid size-7 place-items-center rounded-full bg-accent text-accent-fg hover:brightness-110 disabled:bg-surface-2 disabled:text-muted"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
