import { products } from "@/data/products";
import type { Category, Product, ProductQuery, ProductSearchResult } from "./schemas";

const byId = new Map(products.map((p) => [p.id, p]));

const STOPWORDS = new Set(["a", "an", "the", "for", "with", "and", "or", "of", "to", "in", "on", "i", "me", "my", "need", "want", "some", "good"]);

export function getAllProducts(): readonly Product[] {
  return products;
}

export function getProduct(id: string): Product | undefined {
  return byId.get(id);
}

export function getBrands(category?: Category): string[] {
  const list = category ? products.filter((p) => p.category === category) : products;
  return [...new Set(list.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
}

function haystack(p: Product): string {
  const { cpu = "", gpu = "", connectivity = "" } = p.specs;
  return [p.name, p.brand, p.category, p.blurb, cpu, gpu, connectivity, ...p.tags].join(" ").toLowerCase();
}

function textScore(p: Product, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const hay = haystack(p);
  return tokens.reduce((score, t) => score + (hay.includes(t) ? 1 : 0), 0);
}

export function tokenize(q: string | undefined): string[] {
  if (!q) return [];
  return q
    .toLowerCase()
    .split(/[^a-z0-9+.-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Pure, deterministic catalog search. Latency/failure simulation lives in the route layer. */
export function searchProducts(query: ProductQuery): ProductSearchResult {
  const tokens = tokenize(query.q);
  const brands = query.brands?.map((b) => b.toLowerCase());
  const tags = query.tags?.map((t) => t.toLowerCase());

  const scored = products
    .filter((p) => {
      const s = p.specs;
      if (query.category && p.category !== query.category) return false;
      if (brands?.length && !brands.includes(p.brand.toLowerCase())) return false;
      if (query.minPrice !== undefined && p.price < query.minPrice) return false;
      if (query.maxPrice !== undefined && p.price > query.maxPrice) return false;
      if (query.minRamGB !== undefined && (s.ramGB ?? 0) < query.minRamGB) return false;
      if (query.minBatteryHours !== undefined && (s.batteryHours ?? 0) < query.minBatteryHours) return false;
      if (query.maxWeightGrams !== undefined && s.weightGrams > query.maxWeightGrams) return false;
      if (tags?.length && !tags.every((t) => p.tags.includes(t))) return false;
      if (query.inStockOnly && p.stock === 0) return false;
      return true;
    })
    .map((p) => ({ p, score: textScore(p, tokens) }))
    .filter(({ score }) => score > 0);

  const sort = query.sort ?? "relevance";
  scored.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.p.price - b.p.price;
      case "price-desc":
        return b.p.price - a.p.price;
      case "rating":
        return b.p.rating - a.p.rating;
      case "battery":
        return (b.p.specs.batteryHours ?? 0) - (a.p.specs.batteryHours ?? 0);
      case "weight":
        return a.p.specs.weightGrams - b.p.specs.weightGrams;
      case "relevance":
        return b.score - a.score || b.p.rating - a.p.rating;
    }
  });

  const total = scored.length;
  const limited = query.limit ? scored.slice(0, query.limit) : scored;
  return { products: limited.map(({ p }) => p), total };
}
