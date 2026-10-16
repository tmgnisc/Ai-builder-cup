import { CategorySchema, SortSchema } from "./schemas";
import { PRICE_MAX, PRICE_MIN, type Filters } from "@/store/useCatalogUI";

export function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.sort && filters.sort !== "relevance") {
    params.set("sort", filters.sort);
  }

  if (filters.priceRange[0] > PRICE_MIN) {
    params.set("minPrice", String(filters.priceRange[0]));
  }

  if (filters.priceRange[1] < PRICE_MAX) {
    params.set("maxPrice", String(filters.priceRange[1]));
  }

  if (filters.brands.length > 0) {
    params.set("brands", filters.brands.join(","));
  }

  if (filters.minRamGB !== null) {
    params.set("ram", String(filters.minRamGB));
  }

  if (filters.minBatteryHours !== null) {
    params.set("battery", String(filters.minBatteryHours));
  }

  if (filters.inStockOnly) {
    params.set("inStock", "1");
  }

  return params;
}

export function searchParamsToFilters(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): Partial<Filters> {
  const getParam = (key: string): string | null => {
    if (input instanceof URLSearchParams) {
      return input.get(key);
    }
    const val = input[key];
    if (Array.isArray(val)) return val[0] ?? null;
    return val ?? null;
  };

  const result: Partial<Filters> = {};

  const catRaw = getParam("category");
  if (catRaw) {
    const parsedCat = CategorySchema.safeParse(catRaw);
    if (parsedCat.success) {
      result.category = parsedCat.data;
    }
  }

  const sortRaw = getParam("sort");
  if (sortRaw) {
    const parsedSort = SortSchema.safeParse(sortRaw);
    if (parsedSort.success) {
      result.sort = parsedSort.data;
    }
  }

  const minPrice = Number(getParam("minPrice"));
  const maxPrice = Number(getParam("maxPrice"));
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    result.priceRange = [
      Number.isFinite(minPrice) ? Math.max(PRICE_MIN, minPrice) : PRICE_MIN,
      Number.isFinite(maxPrice) ? Math.min(PRICE_MAX, maxPrice) : PRICE_MAX,
    ];
  }

  const brandsRaw = getParam("brands");
  if (brandsRaw) {
    result.brands = brandsRaw
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
  }

  const ramRaw = Number(getParam("ram"));
  if (Number.isFinite(ramRaw) && ramRaw > 0) {
    result.minRamGB = ramRaw;
  }

  const batteryRaw = Number(getParam("battery"));
  if (Number.isFinite(batteryRaw) && batteryRaw > 0) {
    result.minBatteryHours = batteryRaw;
  }

  const inStockRaw = getParam("inStock");
  if (inStockRaw === "1" || inStockRaw === "true") {
    result.inStockOnly = true;
  }

  return result;
}
