"use client";

import { Headphones, Laptop, LayoutGrid, Plug, Smartphone, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { getCategories } from "@/lib/commerce/catalog";
import type { Category } from "@/lib/commerce/schemas";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { useMagnetic } from "@/lib/useMagnetic";
import { useCatalogUI, useFilters } from "@/store/useCatalogUI";

const ICON: Record<Category | "all", LucideIcon> = {
  all: LayoutGrid,
  laptops: Laptop,
  phones: Smartphone,
  headphones: Headphones,
  accessories: Plug,
};

/** Horizontally scrollable category pills with magnetic hover and a sliding active indicator. */
export function CategoryStrip() {
  const category = useFilters().category;
  const setFilter = useCatalogUI((s) => s.setFilter);
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const categories = getCategories();

  useGSAP(
    () => {
      const nav = navRef.current;
      const ind = indicatorRef.current;
      const active = nav?.querySelector<HTMLElement>('[aria-current="true"]');
      if (!nav || !ind || !active) return;
      const props = { x: active.offsetLeft, width: active.offsetWidth, height: active.offsetHeight, y: active.offsetTop };
      if (motion.reduced || !ind.dataset.ready) {
        gsap.set(ind, props);
        ind.dataset.ready = "1";
      } else {
        gsap.to(ind, { ...props, duration: 0.55, ease: "expo.out" });
      }
    },
    { dependencies: [category], scope: navRef },
  );

  function select(next: Category | null) {
    setFilter("category", next);
    const url = next ? `/?category=${next}#store` : "/#store";
    window.history.replaceState(null, "", url);
  }

  return (
    <div ref={navRef} role="navigation" aria-label="Categories" data-pip-anchor="categories" data-pip-topic="category-pills" className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
      <span ref={indicatorRef} aria-hidden className="absolute left-0 top-0 rounded-full bg-text" />
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
  // The active pill sits on the sliding indicator, so it stays put.
  useMagnetic(ref, active ? 0 : 0.25);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors duration-300",
        active ? "text-bg" : "bg-surface text-muted hairline hover:text-text",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  );
}
