import { describe, expect, it } from "vitest";
import { filtersToSearchParams, searchParamsToFilters } from "./filterUrl";
import { DEFAULT_FILTERS, type Filters } from "@/store/useCatalogUI";

describe("filterUrl serialization and parsing", () => {
  it("serializes default filters to empty search params", () => {
    const params = filtersToSearchParams(DEFAULT_FILTERS);
    expect(params.toString()).toBe("");
  });

  it("serializes custom filters into query parameters", () => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      category: "laptops",
      sort: "price-asc",
      priceRange: [50000, 150000],
      brands: ["Apple", "Lenovo"],
      minRamGB: 16,
      minBatteryHours: 10,
      inStockOnly: true,
    };

    const params = filtersToSearchParams(filters);
    expect(params.get("category")).toBe("laptops");
    expect(params.get("sort")).toBe("price-asc");
    expect(params.get("minPrice")).toBe("50000");
    expect(params.get("maxPrice")).toBe("150000");
    expect(params.get("brands")).toBe("Apple,Lenovo");
    expect(params.get("ram")).toBe("16");
    expect(params.get("battery")).toBe("10");
    expect(params.get("inStock")).toBe("1");
  });

  it("parses URL search params into partial filters", () => {
    const search = new URLSearchParams("category=phones&sort=rating&minPrice=20000&maxPrice=80000&brands=Samsung,Apple&ram=8&battery=24&inStock=1");
    const parsed = searchParamsToFilters(search);

    expect(parsed.category).toBe("phones");
    expect(parsed.sort).toBe("rating");
    expect(parsed.priceRange).toEqual([20000, 80000]);
    expect(parsed.brands).toEqual(["Samsung", "Apple"]);
    expect(parsed.minRamGB).toBe(8);
    expect(parsed.minBatteryHours).toBe(24);
    expect(parsed.inStockOnly).toBe(true);
  });

  it("safely ignores invalid category or sort values in search params", () => {
    const search = new URLSearchParams("category=invalid_cat&sort=invalid_sort");
    const parsed = searchParamsToFilters(search);

    expect(parsed.category).toBeUndefined();
    expect(parsed.sort).toBeUndefined();
  });
});
