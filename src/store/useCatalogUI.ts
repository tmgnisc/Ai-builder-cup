"use client";

import { createContext, useContext, useMemo } from "react";
import { create } from "zustand";
import { getAllProducts, searchProducts } from "@/lib/commerce/catalog";
import type { Category, Product, Sort } from "@/lib/commerce/schemas";

/**
 * Store-front UI state: filters, sort, and Pip's highlighted cards.
 * Filters are applied client-side against the static catalog (instant, no round trip).
 * The agent (Phase 4) and the signals hook (Phase 5) read and write this same store.
 */

export const PRICE_MIN = 0;
export const PRICE_MAX = Math.ceil(Math.max(...getAllProducts().map((p) => p.price)) / 10_000) * 10_000;

export interface Filters {
  category: Category | null;
  priceRange: [number, number];
  brands: string[];
  minRamGB: number | null;
  minBatteryHours: number | null;
  inStockOnly: boolean;
  sort: Sort;
}

export const DEFAULT_FILTERS: Filters = {
  category: null,
  priceRange: [PRICE_MIN, PRICE_MAX],
  brands: [],
  minRamGB: null,
  minBatteryHours: null,
  inStockOnly: false,
  sort: "relevance",
};

export type FilterChange = { [K in keyof Filters]: { key: K; value: Filters[K] } }[keyof Filters];

interface CatalogUIState {
  filters: Filters;
  /** Ids Pip is presenting, in rank order. */
  highlighted: string[];
  /** Every filter change, so the signals hook can detect "price filter changed 3× in 60 s". */
  lastChange: (FilterChange & { at: number }) | null;
  /** False until the client has synced the URL category into the store (see useFilters). */
  categorySynced: boolean;
  syncCategory: (category: Category | null) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: (keep?: Partial<Filters>) => void;
  setHighlighted: (ids: string[]) => void;
}

export const useCatalogUI = create<CatalogUIState>()((set) => ({
  filters: DEFAULT_FILTERS,
  highlighted: [],
  lastChange: null,
  categorySynced: false,
  syncCategory: (category) =>
    set((s) => ({
      categorySynced: true,
      filters: s.filters.category === category ? s.filters : { ...s.filters, category, brands: [] },
    })),
  setFilter: (key, value) =>
    set((s) => {
      const filters = { ...s.filters, [key]: value };
      // Brands are per-category; drop selections that no longer apply.
      if (key === "category") filters.brands = [];
      return { filters, lastChange: { key, value, at: Date.now() } as CatalogUIState["lastChange"] };
    }),
  resetFilters: (keep) => set({ filters: { ...DEFAULT_FILTERS, ...keep } }),
  setHighlighted: (highlighted) => set({ highlighted }),
}));

export function activeFilterCount(f: Filters): number {
  return (
    (f.priceRange[0] > PRICE_MIN || f.priceRange[1] < PRICE_MAX ? 1 : 0) +
    (f.brands.length ? 1 : 0) +
    (f.minRamGB ? 1 : 0) +
    (f.minBatteryHours ? 1 : 0) +
    (f.inStockOnly ? 1 : 0)
  );
}

export function applyFilters(f: Filters): Product[] {
  return searchProducts({
    category: f.category ?? undefined,
    brands: f.brands.length ? f.brands : undefined,
    minPrice: f.priceRange[0] > PRICE_MIN ? f.priceRange[0] : undefined,
    maxPrice: f.priceRange[1] < PRICE_MAX ? f.priceRange[1] : undefined,
    minRamGB: f.minRamGB ?? undefined,
    minBatteryHours: f.minBatteryHours ?? undefined,
    inStockOnly: f.inStockOnly || undefined,
    sort: f.sort,
  }).products;
}

/**
 * The URL's category, provided by StoreSection. Until the client store has synced it,
 * components render with it so SSR and the first client render match the URL
 * (the store is module-global, so it must never be written during SSR).
 */
export const InitialCategoryContext = createContext<Category | null>(null);

export function useFilters(): Filters {
  const filters = useCatalogUI((s) => s.filters);
  const synced = useCatalogUI((s) => s.categorySynced);
  const initial = useContext(InitialCategoryContext);
  return useMemo(() => (synced ? filters : { ...filters, category: initial }), [synced, filters, initial]);
}
