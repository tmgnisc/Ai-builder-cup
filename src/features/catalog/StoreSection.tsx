"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Ticker } from "@/components/ui/Ticker";
import { CATEGORIES, type Category, type Sort } from "@/lib/commerce/schemas";
import { InitialCategoryContext, activeFilterCount, applyFilters, useCatalogUI, useFilters } from "@/store/useCatalogUI";
import { CategoryStrip } from "./CategoryStrip";
import { Filters, SORTS } from "./Filters";
import { ProductGrid } from "./ProductGrid";

/** Store section: category strip, filters (sidebar on desktop, sheet on mobile), sort and the grid. */
export function StoreSection({ initialCategory }: { initialCategory: Category | null }) {
  return (
    <InitialCategoryContext.Provider value={initialCategory}>
      <StoreSectionInner initialCategory={initialCategory} />
    </InitialCategoryContext.Provider>
  );
}

function StoreSectionInner({ initialCategory }: { initialCategory: Category | null }) {
  const filters = useFilters();
  const syncCategory = useCatalogUI((s) => s.syncCategory);
  const setFilter = useCatalogUI((s) => s.setFilter);
  const total = useMemo(() => applyFilters(filters).length, [filters]);
  const [sheetOpen, setSheetOpen] = useState(false);

  // URL → store (header links, back/forward). In-page pill clicks update the store first.
  useEffect(() => syncCategory(initialCategory), [initialCategory, syncCategory]);

  const heading = filters.category ? CATEGORIES.find((c) => c.id === filters.category)?.label : "All products";
  const count = activeFilterCount(filters);

  return (
    <section id="store" className="mx-auto max-w-page scroll-mt-20 px-4 sm:px-6" aria-labelledby="store-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="store-heading" className="font-display text-2xl font-semibold tracking-tight">
            {heading}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted">
            <Ticker value={total} duration={0.5} /> {total === 1 ? "product" : "products"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm hairline lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden /> Filters
            {count > 0 && <span className="rounded-full bg-accent px-1.5 font-mono text-2xs text-accent-fg">{count}</span>}
          </button>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => setFilter("sort", e.target.value as Sort)}
            className="h-10 rounded-full bg-surface px-4 text-sm hairline focus-visible:outline-2"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <CategoryStrip />
      </div>

      <div className="mt-8 grid gap-8 lg:store-grid">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-24">
            <Filters />
          </div>
        </aside>
        <ProductGrid />
      </div>

      <Drawer open={sheetOpen} onOpenChange={setSheetOpen} title="Filters" side="bottom" description={`${total} matching products`}>
        <Filters className="px-5 py-5" inSheet />
      </Drawer>
    </section>
  );
}
