import Link from "next/link";
import { StockBadge } from "@/components/ui/Badge";
import { formatNPR, keySpecs } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { ProductImage } from "./ProductImage";

/** Phase 1 card. Phase 3 adds stagger-in, cursor spotlight, lift and Pip highlight states. */
export function ProductCard({ product }: { product: Product }) {
  const specs = keySpecs(product);
  const out = product.stock === 0;
  return (
    <article
      data-product-id={product.id}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface hairline transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[inset_0_0_0_1px_var(--border-strong),0_24px_48px_-24px_rgb(0_0_0/0.6)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProductImage product={product} className={out ? "opacity-60 grayscale-[40%]" : undefined} />
        <StockBadge stock={product.stock} className="absolute left-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs text-muted">{product.brand}</p>
          <h3 className="mt-0.5 line-clamp-1 font-display text-[15px] font-medium tracking-tight">
            <Link href={`/product/${product.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
              {product.name}
            </Link>
          </h3>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {specs.map((s) => (
            <div key={s.key} className="min-w-0 rounded-lg bg-surface-2 px-2 py-1.5">
              <dt className="truncate text-[10px] uppercase tracking-wider text-muted">{s.label}</dt>
              <dd className="truncate font-mono text-xs">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-auto font-mono text-lg font-semibold tabular">{formatNPR(product.price)}</p>
      </div>
      {/* Keyboard focus ring for the stretched link */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] group-has-[:focus-visible]:outline group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-accent-text" />
    </article>
  );
}
