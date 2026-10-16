import { cn } from "@/lib/cn";
import { initials } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";

/** Simple category silhouettes drawn in a 100×100 box. */
const GLYPH: Record<Product["category"], string> = {
  laptops: "M22 30h56a3 3 0 0 1 3 3v31H19V33a3 3 0 0 1 3-3Zm-10 38h76l-4 6H16Z",
  phones: "M38 18h24a5 5 0 0 1 5 5v54a5 5 0 0 1-5 5H38a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5Zm8 4h8",
  headphones:
    "M24 58v-8a26 26 0 0 1 52 0v8M20 58h10v20H24a4 4 0 0 1-4-4Zm60 0H70v20h6a4 4 0 0 0 4-4Z",
  accessories: "M30 34h40a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6V40a6 6 0 0 1 6-6Zm6 12h6m8 0h6m8 0h6M38 56h24",
};

interface ProductImageProps {
  product: Pick<Product, "id" | "brand" | "name" | "category" | "palette">;
  className?: string;
  /** Distinguishes multiple renders of the same product on one page (gradient ids). */
  variant?: string;
  showInitials?: boolean;
  /** Gallery angle: same art, different framing and light. */
  view?: "front" | "angle" | "detail";
}

const VIEW: Record<NonNullable<ProductImageProps["view"]>, { glyph: string; glow: [number, number] }> = {
  front: { glyph: "translate(50 50) scale(0.62) translate(-50 -50)", glow: [70, 22] },
  angle: { glyph: "translate(50 52) rotate(-14) skewX(-10) scale(0.66) translate(-50 -50)", glow: [24, 18] },
  detail: { glyph: "translate(60 58) scale(1.25) translate(-50 -50)", glow: [82, 80] },
};

/**
 * Generated placeholder art: brand-palette gradient, soft glow, category glyph and initials.
 * The SVG uses "meet" with an over-sized background so the glyph is never cropped at any aspect ratio.
 */
export function ProductImage({ product, className, variant = "card", showInitials = true, view = "front" }: ProductImageProps) {
  const [a, b] = product.palette;
  const id = `pi-${product.id}-${variant}-${view}`;
  const v = VIEW[view];
  return (
    <div
      role="img"
      aria-label={`${product.brand} ${product.name}`}
      className={cn("relative size-full overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${b}, var(--bg))` }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id={`${id}-glow`} cx={v.glow[0]} cy={v.glow[1]} r="80" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={a} stopOpacity="0.85" />
            <stop offset="0.55" stopColor={a} stopOpacity="0.12" />
            <stop offset="1" stopColor={a} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="-100" y="-100" width="300" height="300" fill={`url(#${id}-glow)`} />
        <path
          d={GLYPH[product.category]}
          transform={v.glyph}
          fill="none"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {showInitials && (
        <span
          aria-hidden
          className="absolute bottom-3 right-3 font-display text-xs font-semibold tracking-wider text-white/75"
        >
          {initials(product).toUpperCase()}
        </span>
      )}
    </div>
  );
}
