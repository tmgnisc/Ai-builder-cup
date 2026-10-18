"use client";

import { Headphones, Laptop, LayoutGrid, Plug, Shirt, Smartphone, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { getCategories } from "@/lib/commerce/catalog";
import type { Category } from "@/lib/commerce/schemas";
import { useMagnetic } from "@/lib/useMagnetic";
import { useCatalogUI, useFilters } from "@/store/useCatalogUI";

const ICON: Record<Category | "all", LucideIcon> = {
  all: LayoutGrid,
  laptops: Laptop,
  phones: Smartphone,
  headphones: Headphones,
  accessories: Plug,
  clothing: Shirt,
};

/** Horizontally scrollable category pills with magnetic hover. The active pill carries its own fill, so it never depends on JS layout. */
export function CategoryStrip() {
  const category = useFilters().category;
  const setFilter = useCatalogUI((s) => s.setFilter);
  const categories = getCategories();

  function select(next: Category | null) {
    setFilter("category", next);
    const url = next ? `/?category=${next}#store` : "/#store";
    window.history.replaceState(null, "", url);
  }

  return (
    <div role="navigation" aria-label="Categories" data-pip-anchor="categories" data-pip-topic="category-pills" className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
      <Pill active={category === null} onClick={() => select(null)} icon={ICON.all}>
        All
      </Pill>
      {categories.map((c) => (
        <Pill key={c.id} active={category === c.id} onClick={() => select(c.id)} icon={ICON[c.id] ?? LayoutGrid}>
          {c.label}
        </Pill>
      ))}
    </div>
  );
}

function Pill({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: LucideIcon; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useMagnetic(ref, active ? 0 : 0.25);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-300",
        active ? "bg-text text-bg" : "bg-surface text-muted hairline hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  );
}
