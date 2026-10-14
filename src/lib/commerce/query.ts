import { ProductQuerySchema, type ProductQuery } from "./schemas";

/** URL ⇄ ProductQuery. Shared by the route handler and the browser client. */

const NUMERIC = {
  minPrice: "minPrice",
  maxPrice: "maxPrice",
  minRamGB: "minRam",
  minBatteryHours: "minBattery",
  maxWeightGrams: "maxWeight",
  limit: "limit",
} as const satisfies Partial<Record<keyof ProductQuery, string>>;

function list(sp: URLSearchParams, key: string): string[] | undefined {
  const values = sp.getAll(key).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

export function parseProductQuery(sp: URLSearchParams) {
  const raw: Record<string, unknown> = {
    q: sp.get("q") ?? undefined,
    category: sp.get("category") ?? undefined,
    brands: list(sp, "brand"),
    tags: list(sp, "tag"),
    sort: sp.get("sort") ?? undefined,
    inStockOnly: sp.has("inStock") ? sp.get("inStock") !== "0" : undefined,
  };
  for (const [field, param] of Object.entries(NUMERIC)) {
    const v = sp.get(param);
    if (v !== null && v !== "") raw[field] = Number(v);
  }
  return ProductQuerySchema.safeParse(raw);
}

export function toSearchParams(query: ProductQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.category) sp.set("category", query.category);
  query.brands?.forEach((b) => sp.append("brand", b));
  query.tags?.forEach((t) => sp.append("tag", t));
  if (query.sort) sp.set("sort", query.sort);
  if (query.inStockOnly) sp.set("inStock", "1");
  for (const [field, param] of Object.entries(NUMERIC) as [keyof typeof NUMERIC, string][]) {
    const v = query[field];
    if (v !== undefined) sp.set(param, String(v));
  }
  return sp;
}
