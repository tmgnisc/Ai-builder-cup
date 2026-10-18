"use client";

import Link from "next/link";
import { ArrowLeft, Star, Truck } from "lucide-react";
import { AddToCartButton } from "./AddToCartButton";
import { AskPipButton } from "./AskPipButton";
import { ProductGallery } from "./ProductGallery";
import { ColorPicker } from "./ColorPicker";
import { CompareToggle } from "@/features/compare";
import { ProductViewTracker } from "@/components/signals/ProductViewTracker";
import { Badge, StockBadge } from "@/components/ui/Badge";
import { DELIVERY_RULES } from "@/lib/commerce/delivery";
import { formatNPR, formatWarranty, specRows } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";

export function ProductDetailView({ product }: { product: Product }) {
  const rows = specRows(product);
  const isClothing = product.category === "clothing";

  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <ProductViewTracker productId={product.id} />
      <Link href="/#store" className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Back to store
      </Link>

      <div className="mt-6 grid gap-10 lg:product-detail-grid">
        <ProductGallery product={product} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span data-pip-anchor="stock" data-pip-topic="stock-badge" data-pip-product={product.id}>
              <StockBadge stock={product.stock} />
            </span>
            {product.tags.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted">{product.brand}</p>
          <h1 className="mt-1 page-title">
            {product.name}
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
            <Star className="size-4 fill-thinking text-thinking" aria-hidden />
            <span className="font-mono text-text">{product.rating.toFixed(1)}</span>
            <span>({product.reviewCount.toLocaleString("en-IN")} reviews)</span>
          </p>
          <p className="mt-5 max-w-prose text-muted">{product.blurb}</p>

          <p data-pip-anchor="price" data-pip-topic="price" data-pip-product={product.id} className="mt-8 w-fit font-mono text-4xl font-semibold tracking-tight tabular">{formatNPR(product.price)}</p>
          <p className="mt-1 text-xs text-muted">
            Inclusive of VAT{isClothing ? "" : ` · ${formatWarranty(product.specs.warrantyMonths)} warranty`}
          </p>

          {isClothing && (
            <div className="mt-6">
              <ColorPicker product={product} />
            </div>
          )}

          <div className="mt-6 flex max-w-md flex-col gap-3">
            <div data-pip-anchor="add-to-cart" data-pip-topic="add-to-cart" data-pip-product={product.id}>
              <AddToCartButton productId={product.id} disabled={product.stock === 0} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div data-pip-anchor="compare" data-pip-topic="compare-toggle" data-pip-product={product.id}>
                <CompareToggle productId={product.id} productName={`${product.brand} ${product.name}`} variant="pill" className="w-full" />
              </div>
              <AskPipButton productName={product.name} className="w-full" />
            </div>
          </div>

          <dl data-pip-anchor="delivery" data-pip-topic="delivery" data-pip-product={product.id} className="mt-6 grid max-w-md gap-2 rounded-card bg-surface p-4 text-sm hairline">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <div className="flex-1">
                <dt className="font-medium">Kathmandu Valley · {DELIVERY_RULES.valley.days}</dt>
                <dd className="text-xs text-muted">
                  {formatNPR(DELIVERY_RULES.valley.fee)}, free over {formatNPR(DELIVERY_RULES.valley.freeOver)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <div className="flex-1">
                <dt className="font-medium">Rest of Nepal · {DELIVERY_RULES.outside.days}</dt>
                <dd className="text-xs text-muted">
                  {formatNPR(DELIVERY_RULES.outside.fee)}, free over {formatNPR(DELIVERY_RULES.outside.freeOver)}
                </dd>
              </div>
            </div>
          </dl>

          <section aria-labelledby="specs-heading" className="mt-10" data-pip-anchor="specs" data-pip-topic="spec-table" data-pip-product={product.id}>
            <h2 id="specs-heading" className="panel-title">
              {isClothing ? "Details" : "Specifications"}
            </h2>
            <table className="mt-4 w-full overflow-hidden rounded-card text-sm hairline">
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key} className="bg-surface" data-pip-anchor={`spec:${r.key}`} data-pip-topic={`spec-${r.key}`} data-pip-product={product.id}>
                    <th scope="row" className="w-40 px-4 py-3 text-left font-normal text-muted">
                      {r.label}
                    </th>
                    <td className="px-4 py-3 font-mono text-sm">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
