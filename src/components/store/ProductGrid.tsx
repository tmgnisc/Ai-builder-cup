"use client";

import { SearchX } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Flip, gsap, motion, ScrollTrigger, useGSAP } from "@/lib/motion";
import { applyFilters, useCatalogUI, useFilters } from "@/store/useCatalogUI";
import { ProductCard } from "./ProductCard";

const CARD = "[data-flip-id]";
/** Inline transforms left behind by GSAP would override the CSS hover lift, so clear them when done. */
const CLEAR = "transform,translate,rotate,scale,opacity,visibility";

/**
 * Filtered product grid.
 * - First load: cards stagger in as they scroll into view (ScrollTrigger.batch).
 * - Filter changes: Flip animates cards that stay to their new slots; new cards fade/scale in.
 *   The Flip state is captured in a store subscription, i.e. before React re-renders.
 */
export function ProductGrid() {
  const filters = useFilters();
  const resetFilters = useCatalogUI((s) => s.resetFilters);
  const products = useMemo(() => applyFilters(filters), [filters]);
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const batchTriggers = useRef<ScrollTrigger[]>([]);

  // Capture card positions synchronously when filters change, before the DOM updates.
  useLayoutEffect(
    () =>
      useCatalogUI.subscribe((s, prev) => {
        if (s.filters !== prev.filters && gridRef.current && !motion.reduced) {
          flipState.current = Flip.getState(gridRef.current.querySelectorAll(CARD));
        }
      }),
    [],
  );

  // Initial scroll-in reveal.
  useGSAP(
    () => {
      if (motion.reduced || !gridRef.current) return;
      const cards = gridRef.current.querySelectorAll(CARD);
      gsap.set(cards, { autoAlpha: 0, y: 48 });
      batchTriggers.current = ScrollTrigger.batch(cards, {
        start: "top 94%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.07, overwrite: true, clearProps: CLEAR }),
      });
    },
    { scope: gridRef },
  );

  // Filter-change animation.
  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state || !gridRef.current) return;
    flipState.current = null;

    // Anything not yet revealed by the scroll batch becomes visible now; the batch is done.
    batchTriggers.current.forEach((t) => t.kill());
    batchTriggers.current = [];
    const cards = gridRef.current.querySelectorAll<HTMLElement>(CARD);
    gsap.set(cards, { clearProps: CLEAR });

    Flip.from(state, {
      targets: cards,
      duration: 0.65,
      ease: "expo.out",
      absolute: true,
      nested: true,
      stagger: 0.015,
      onEnter: (els) =>
        gsap.fromTo(els, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "expo.out", delay: 0.12, clearProps: CLEAR }),
      onComplete: () => {
        gsap.set(cards, { clearProps: CLEAR });
        ScrollTrigger.refresh();
      },
    });
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="grid place-items-center rounded-[var(--radius-panel)] bg-surface px-6 py-20 text-center hairline">
        <SearchX className="size-8 text-muted" aria-hidden />
        <p className="mt-3 font-display text-lg font-semibold">Nothing matches those filters</p>
        <p className="mt-1 max-w-sm text-sm text-muted">Try widening the price range or removing a brand. Or tell Pip what you need.</p>
        <Button variant="secondary" className="mt-5" onClick={() => resetFilters({ category: filters.category })}>
          Reset filters
        </Button>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-live="polite" aria-busy={false}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
