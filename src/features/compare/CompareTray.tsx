"use client";

import { GitCompareArrows, X } from "lucide-react";
import { useRef } from "react";
import { getProduct } from "@/lib/commerce/catalog";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { MAX_COMPARE, useCompare } from "@/store/useCompare";
import { ProductImage } from "@/features/catalog";

/**
 * Floating tray listing products picked for comparison. Sits bottom-left so it never
 * collides with Pip's dock (bottom-right). Opens the compare drawer once 2+ are picked.
 */
export function CompareTray() {
  const ids = useCompare((s) => s.ids);
  const open = useCompare((s) => s.open);
  const rejectedAt = useCompare((s) => s.rejectedAt);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);
  const setOpen = useCompare((s) => s.setOpen);
  const ref = useRef<HTMLDivElement>(null);
  const visible = ids.length > 0 && !open;

  useGSAP(
    () => {
      gsap.to(ref.current, {
        y: visible ? 0 : 120,
        autoAlpha: visible ? 1 : 0,
        duration: motion.dur(0.55),
        ease: visible ? "expo.out" : "power2.in",
      });
    },
    { dependencies: [visible] },
  );

  // Nudge when a 4th item is refused.
  useGSAP(
    () => {
      if (!rejectedAt || motion.reduced) return;
      gsap.fromTo(ref.current, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    },
    { dependencies: [rejectedAt] },
  );

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Comparison tray"
      className="glass invisible fixed bottom-4 left-4 z-40 flex compare-tray-w-mobile items-center gap-2 rounded-full p-1.5 pl-2 opacity-0 md:bottom-6 md:left-6 md:compare-tray-w-desktop"
    >
      <ul className="flex items-center gap-1.5">
        {ids.map((id) => {
          const p = getProduct(id);
          if (!p) return null;
          return (
            <li key={id} className="group relative size-10 shrink-0 overflow-hidden rounded-full hairline">
              <ProductImage product={p} variant="tray" showInitials={false} />
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`Remove ${p.brand} ${p.name} from comparison`}
                className="absolute inset-0 grid place-items-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-4" />
              </button>
            </li>
          );
        })}
        {Array.from({ length: MAX_COMPARE - ids.length }).map((_, i) => (
          <li key={`empty-${i}`} aria-hidden className="hidden size-10 rounded-full border border-dashed border-border-strong sm:block" />
        ))}
      </ul>
      <button
        type="button"
        disabled={ids.length < 2}
        onClick={() => setOpen(true)}
        className="ml-1 inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-searching px-4 text-sm font-semibold text-bg transition-[filter,opacity] hover:brightness-110 disabled:bg-surface-2 disabled:text-muted"
      >
        <GitCompareArrows className="size-4" aria-hidden />
        {ids.length < 2 ? "Pick one more" : `Compare ${ids.length}`}
      </button>
      <button type="button" onClick={clear} aria-label="Clear comparison" className="grid size-10 place-items-center rounded-full text-muted hover:text-text">
        <X className="size-4" />
      </button>
    </div>
  );
}
