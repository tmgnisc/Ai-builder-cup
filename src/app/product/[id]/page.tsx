import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/features/catalog";
import { getAllProducts, getProduct } from "@/lib/commerce/catalog";

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProduct((await params).id);
  return p ? { title: `${p.brand} ${p.name}`, description: p.blurb } : {};
}

/** Product detail: thin page wiring catalog data to ProductDetailView feature component. */
export default async function ProductPage({ params }: Params) {
  const product = getProduct((await params).id);
  if (!product) notFound();

  return <ProductDetailView product={product} />;
}
