"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/commerce/schemas";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { ProductImage } from "./ProductImage";

const VIEWS = [
  { id: "front", label: "Front" },
  { id: "angle", label: "Angle" },
  { id: "detail", label: "Detail" },
] as const;
type View = (typeof VIEWS)[number]["id"];

/** Main image + thumbnails; switching cross-fades and gently zooms the new view in. */
export function ProductGallery({ product }: { product: Product }) {
  const anchor = { "data-pip-anchor": "gallery", "data-pip-topic": "gallery", "data-pip-product": product.id };
  const [view, setView] = useState<View>("front");
  const mainRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (motion.reduced) return;
      gsap.fromTo(mainRef.current, { autoAlpha: 0.2, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "expo.out" });
    },
    { dependencies: [view] },
  );

  return (
    <div {...anchor} className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-panel hairline">
        <div ref={mainRef} data-gallery-main className="aspect-[4/3]">
          <ProductImage product={product} variant="hero" view={view} className={product.stock === 0 ? "grayscale-[35%]" : undefined} />
        </div>
      </div>
      <div role="tablist" aria-label="Product views" className="grid grid-cols-3 gap-3">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            type="button"
            aria-selected={view === v.id}
            aria-label={`${v.label} view`}
            onClick={() => setView(v.id)}
            className={cn(
              "aspect-[4/3] overflow-hidden rounded-2xl transition-[box-shadow,opacity] duration-300",
              view === v.id ? "shadow-[inset_0_0_0_2px_var(--accent-text)]" : "opacity-60 hairline hover:opacity-100",
            )}
          >
            <ProductImage product={product} variant="thumb" view={v.id} showInitials={false} className="pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
}
