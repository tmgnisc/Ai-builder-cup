"use client";

import { useCallback } from "react";
import { useCatalogUI, useFilters, type Filters } from "@/store/useCatalogUI";
import { filtersToSearchParams } from "@/lib/commerce/filterUrl";

/**
 * Hook for syncing filter state with URL query parameters.
 */
export function useFilterParams() {
  const filters = useFilters();
  const setFilter = useCatalogUI((s) => s.setFilter);
  const resetFilters = useCatalogUI((s) => s.resetFilters);

  // Sync state changes to browser URL without triggering full Next.js page reloads
  const updateUrl = useCallback((newFilters: Filters) => {
    if (typeof window === "undefined") return;
    const params = filtersToSearchParams(newFilters);
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", newUrl);
  }, []);

  // Update a single filter and synchronize URL
  const setFilterAndSyncUrl = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilter(key, value);
      const updated = { ...filters, [key]: value };
      updateUrl(updated);
    },
    [filters, setFilter, updateUrl],
  );

  return {
    filters,
    setFilter: setFilterAndSyncUrl,
    resetFilters,
    updateUrl,
  };
}
