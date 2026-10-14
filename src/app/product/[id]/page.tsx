import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { AddToCartButton } from "@/components/store/AddToCartButton";
import { AskPipButton } from "@/components/store/AskPipButton";
import { CompareToggle } from "@/components/store/CompareToggle";
import { ProductGallery } from "@/components/store/ProductGallery";
import { Badge, StockBadge } from "@/components/ui/Badge";
import { getAllProducts, getProduct } from "@/lib/commerce/catalog";
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
    <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6">
      <Link href="/#store" className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Back to store
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        <ProductGallery product={product} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StockBadge stock={product.stock} />
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

          <p className="mt-8 font-mono text-4xl font-semibold tracking-tight tabular">{formatNPR(product.price)}</p>
          <p className="mt-1 text-xs text-muted">Inclusive of VAT · {formatWarranty(product.specs.warrantyMonths)} warranty</p>

          <div className="mt-6 flex flex-wrap items-start gap-3">
            <AddToCartButton productId={product.id} disabled={product.stock === 0} />
            <CompareToggle productId={product.id} productName={`${product.brand} ${product.name}`} variant="pill" />
            <AskPipButton productName={product.name} />
          </div>

          <section aria-labelledby="specs-heading" className="mt-10">
            <h2 id="specs-heading" className="font-display text-lg font-semibold tracking-tight">
              Specifications
            </h2>
            <table className="mt-4 w-full overflow-hidden rounded-[var(--radius-card)] text-sm hairline">
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key} className="bg-surface">
                    <th scope="row" className="w-40 px-4 py-3 text-left font-normal text-muted">
                      {r.label}
                    </th>
                    <td className="px-4 py-3 font-mono text-[13px]">{r.value}</td>
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
