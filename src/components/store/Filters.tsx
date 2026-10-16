"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { getBrands } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import type { Sort } from "@/lib/commerce/schemas";
import { DEFAULT_FILTERS, PRICE_MAX, PRICE_MIN, activeFilterCount, useCatalogUI, useFilters } from "@/store/useCatalogUI";

const PRICE_STEP = 5_000;
const COMMIT_DELAY_MS = 300;

export const SORTS: { id: Sort; label: string }[] = [
  { id: "relevance", label: "Recommended" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
  { id: "battery", label: "Longest battery" },
  { id: "weight", label: "Lightest" },
];

const BRANDS_COLLAPSED = 8;
const RAM_OPTIONS = [null, 8, 16, 24] as const;
const BATTERY_OPTIONS = [null, 8, 12, 20, 30] as const;

/** Filter panel. Rendered in the desktop sidebar and inside the mobile filter sheet. */
export function Filters({ className, inSheet = false }: { className?: string; inSheet?: boolean }) {
  const filters = useFilters();
  const setFilter = useCatalogUI((s) => s.setFilter);
  const resetFilters = useCatalogUI((s) => s.resetFilters);
  const brands = useMemo(() => getBrands(filters.category ?? undefined), [filters.category]);
  const showRam = filters.category === null || filters.category === "laptops" || filters.category === "phones";
  const count = activeFilterCount(filters);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const visibleBrands = showAllBrands ? brands : brands.slice(0, BRANDS_COLLAPSED);

  return (
    <div className={cn("flex flex-col gap-7", className)}>
      <div className="flex items-center justify-between">
        <h2 className={cn("font-display text-sm font-semibold tracking-tight", inSheet && "sr-only")}>
          Filters{count > 0 && <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 font-mono text-2xs text-accent-fg">{count}</span>}
        </h2>
        <button
          type="button"
          onClick={() => resetFilters({ category: filters.category, sort: filters.sort })}
          disabled={count === 0}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          <RotateCcw className="size-3" aria-hidden /> Reset
        </button>
      </div>

      <PriceRange anchor={inSheet ? undefined : "filter-price"} />

      <Group label="Brand" anchor={inSheet ? undefined : "filter-brand"}>
        <div className="flex flex-col gap-1">
          {visibleBrands.map((b) => {
            const checked = filters.brands.includes(b);
            return (
              <label key={b} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm text-muted hover:text-text">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setFilter("brands", checked ? filters.brands.filter((x) => x !== b) : [...filters.brands, b])}
                  className="size-4 rounded accent-[var(--accent)]"
                />
                <span className={checked ? "text-text" : undefined}>{b}</span>
              </label>
            );
          })}
          {brands.length > BRANDS_COLLAPSED && (
            <button
              type="button"
              onClick={() => setShowAllBrands((v) => !v)}
              aria-expanded={showAllBrands}
              className="mt-1 self-start rounded-full px-1 text-xs text-accent-text hover:underline"
            >
              {showAllBrands ? "Show fewer" : `Show all ${brands.length}`}
            </button>
          )}
        </div>
      </Group>

      {showRam && (
        <Group label="Memory (at least)" anchor={inSheet ? undefined : "filter-ram"}>
          <Segmented
            options={RAM_OPTIONS.map((v) => ({ value: v, label: v ? `${v} GB` : "Any" }))}
            value={filters.minRamGB}
            onChange={(v) => setFilter("minRamGB", v)}
          />
        </Group>
      )}

      <Group label="Battery (at least)" anchor={inSheet ? undefined : "filter-battery"}>
        <Segmented
          options={BATTERY_OPTIONS.map((v) => ({ value: v, label: v ? `${v} h` : "Any" }))}
          value={filters.minBatteryHours}
          onChange={(v) => setFilter("minBatteryHours", v)}
        />
      </Group>

      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
        <span>In stock only</span>
        <input
          type="checkbox"
          role="switch"
          checked={filters.inStockOnly}
          onChange={(e) => setFilter("inStockOnly", e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-6 w-10 rounded-full bg-surface-2 hairline transition-colors peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent-text after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-muted after:transition-transform after:duration-300 peer-checked:after:translate-x-4 peer-checked:after:bg-accent-fg"
        />
      </label>
    </div>
  );
}

function Group({ label, anchor, children }: { label: string; anchor?: string; children: React.ReactNode }) {
  return (
    <fieldset data-pip-anchor={anchor} data-pip-topic={anchor}>
      <legend className="mb-2.5 text-2xs font-medium uppercase tracking-wider text-muted">{label}</legend>
      {children}
    </fieldset>
  );
}

function Segmented<T extends number | null>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1.5 font-mono text-xs transition-colors",
            value === o.value ? "bg-text text-bg" : "bg-surface-2 text-muted hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Dual-thumb price slider. Dragging updates local state; the store is updated once the
 * user pauses, so each "change" the signals engine sees is a deliberate one.
 */
function PriceRange({ anchor }: { anchor?: string }) {
  const committed = useCatalogUI((s) => s.filters.priceRange);
  const setFilter = useCatalogUI((s) => s.setFilter);
  const [range, setRange] = useState<[number, number]>(committed);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();

  // Follow external changes (reset, agent).
  useEffect(() => setRange(committed), [committed]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function update(next: [number, number]) {
    setRange(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFilter("priceRange", next), COMMIT_DELAY_MS);
  }

  const [lo, hi] = range;
  const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const isDefault = lo === DEFAULT_FILTERS.priceRange[0] && hi === DEFAULT_FILTERS.priceRange[1];

  return (
    <Group label="Price" anchor={anchor}>
      <div className="mb-3 flex items-baseline justify-between font-mono text-xs">
        <span>{formatNPR(lo)}</span>
        <span className="text-muted">to</span>
        <span>{hi >= PRICE_MAX ? `${formatNPR(hi)}+` : formatNPR(hi)}</span>
      </div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-2" />
        <div
          className={cn("absolute top-1/2 h-1 -translate-y-1/2 rounded-full", isDefault ? "bg-muted/50" : "bg-accent")}
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          id={`${id}-min`}
          type="range"
          aria-label="Minimum price"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={lo}
          onChange={(e) => update([Math.min(+e.target.value, hi - PRICE_STEP), hi])}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
        <input
          id={`${id}-max`}
          type="range"
          aria-label="Maximum price"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={hi}
          onChange={(e) => update([lo, Math.max(+e.target.value, lo + PRICE_STEP)])}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
      </div>
    </Group>
  );
}
