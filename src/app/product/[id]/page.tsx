import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { AddToCartButton } from "@/components/store/AddToCartButton";
import { AskPipButton } from "@/components/store/AskPipButton";
import { CompareToggle } from "@/features/compare";
import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductViewTracker } from "@/components/signals/ProductViewTracker";
import { Badge, StockBadge } from "@/components/ui/Badge";
import { getAllProducts, getProduct } from "@/lib/commerce/catalog";
import { DELIVERY_RULES } from "@/lib/commerce/delivery";
import { formatNPR, formatWarranty, specRows } from "@/lib/commerce/format";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProduct((await params).id);
  return p ? { title: `${p.brand} ${p.name}`, description: p.blurb } : {};
}

/** Product detail: gallery, spec table, add to cart (fly-to-cart), compare toggle, "Ask Pip". */
export default async function ProductPage({ params }: Params) {
  const product = getProduct((await params).id);
  if (!product) notFound();

  const rows = specRows(product);

  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <ProductViewTracker productId={product.id} />
      <Link href="/#store" className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Back to store
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
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
          <h1 className="mt-1 font-display text-[clamp(1.8rem,3.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
            {product.name}
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
            <Star className="size-4 fill-thinking text-thinking" aria-hidden />
            <span className="font-mono text-text">{product.rating.toFixed(1)}</span>
            <span>({product.reviewCount.toLocaleString("en-IN")} reviews)</span>
          </p>
          <p className="mt-5 max-w-prose text-muted">{product.blurb}</p>

          <p data-pip-anchor="price" data-pip-topic="price" data-pip-product={product.id} className="mt-8 w-fit font-mono text-4xl font-semibold tracking-tight tabular">{formatNPR(product.price)}</p>
          <p className="mt-1 text-xs text-muted">Inclusive of VAT · {formatWarranty(product.specs.warrantyMonths)} warranty</p>

          <div className="mt-6 flex flex-wrap items-start gap-3">
            <div data-pip-anchor="add-to-cart" data-pip-topic="add-to-cart" data-pip-product={product.id}>
              <AddToCartButton productId={product.id} disabled={product.stock === 0} />
            </div>
            <div data-pip-anchor="compare" data-pip-topic="compare-toggle" data-pip-product={product.id}>
              <CompareToggle productId={product.id} productName={`${product.brand} ${product.name}`} variant="pill" />
            </div>
            <AskPipButton productName={product.name} />
          </div>

          <p data-pip-anchor="delivery" data-pip-topic="delivery" data-pip-product={product.id} className="mt-5 w-fit rounded-xl bg-surface px-3.5 py-2.5 text-xs text-muted hairline">
            <span className="text-text">Delivery:</span> Kathmandu valley {DELIVERY_RULES.valley.days} ({formatNPR(DELIVERY_RULES.valley.fee)}, free over{" "}
            {formatNPR(DELIVERY_RULES.valley.freeOver)}) · rest of Nepal {DELIVERY_RULES.outside.days}
          </p>

          <section aria-labelledby="specs-heading" className="mt-10" data-pip-anchor="specs" data-pip-topic="spec-table" data-pip-product={product.id}>
            <h2 id="specs-heading" className="font-display text-lg font-semibold tracking-tight">
              Specifications
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
