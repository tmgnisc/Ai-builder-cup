import fs from "node:fs";
import path from "node:path";
import { products } from "../src/data/products";
import { searchProducts } from "../src/lib/commerce/catalog";
import { compareProducts, type CompareKey } from "../src/lib/commerce/compare";
import type { Product, ProductQuery } from "../src/lib/commerce/schemas";

const outDir = path.resolve(__dirname, "../backend/tests/fixtures");
const appDataDir = path.resolve(__dirname, "../backend/app/data");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(appDataDir, { recursive: true });

// 1. Export full catalog
fs.writeFileSync(
  path.join(appDataDir, "products.json"),
  JSON.stringify(products, null, 2),
  "utf-8"
);
fs.writeFileSync(
  path.join(outDir, "catalog.json"),
  JSON.stringify(products, null, 2),
  "utf-8"
);

// 2. Representative queries (at least 25 queries)
const testQueries: ProductQuery[] = [
  { q: "laptop" },
  { q: "docker" },
  { q: "sony" },
  { q: "oled" },
  { q: "feather-light" },
  { category: "laptops" },
  { category: "phones" },
  { category: "headphones" },
  { category: "accessories" },
  { category: "laptops", maxPrice: 120_000, minRamGB: 16, minBatteryHours: 8 },
  { category: "laptops", maxPrice: 120_000, minRamGB: 16, minBatteryHours: 8, inStockOnly: true },
  { category: "laptops", minPrice: 150_000 },
  { category: "laptops", sort: "price-asc" },
  { category: "laptops", sort: "price-desc" },
  { category: "phones", sort: "battery" },
  { category: "laptops", sort: "weight" },
  { category: "headphones", sort: "rating" },
  { brands: ["Apple"] },
  { brands: ["lenovo", "acer"] },
  { tags: ["travel"] },
  { tags: ["developer", "student"] },
  { maxWeightGrams: 1400 },
  { minBatteryHours: 15 },
  { minRamGB: 32 },
  { inStockOnly: true },
  { q: "nonexistentproductquery123" },
  { category: "accessories", limit: 3 },
  { category: "laptops", sort: "relevance", q: "ryzen" },
  {},
  { q: "pro", limit: 5 },
];

const queryResults = testQueries.map((query) => ({
  query,
  result: searchProducts(query),
}));

fs.writeFileSync(
  path.join(outDir, "queries.json"),
  JSON.stringify(queryResults, null, 2),
  "utf-8"
);

// 3. Comparisons (at least 5 comparisons)
const productMap = new Map(products.map((p) => [p.id, p]));
const p = (id: string): Product => {
  const item = productMap.get(id);
  if (!item) throw new Error(`Product ${id} not found`);
  return item;
};

const comparisonCases = [
  {
    name: "ideapad_vs_swift_default",
    productIds: ["lenovo-ideapad-slim-5-14", "acer-swift-go-14"],
    options: {},
  },
  {
    name: "ideapad_vs_swift_docker_context",
    productIds: ["lenovo-ideapad-slim-5-14", "acer-swift-go-14"],
    options: { context: "Docker + travel" },
  },
  {
    name: "ideapad_vs_swift_weight_priority",
    productIds: ["lenovo-ideapad-slim-5-14", "acer-swift-go-14"],
    options: { priorities: ["weight", "price"] as CompareKey[] },
  },
  {
    name: "three_way_cross_category",
    productIds: ["lenovo-ideapad-slim-5-14", "acer-swift-go-14", "sony-wh-1000xm5"],
    options: {},
  },
  {
    name: "macbook_vs_ideapad",
    productIds: ["apple-macbook-air-m3-13", "lenovo-ideapad-slim-5-14"],
    options: {},
  },
  {
    name: "iphone_vs_s24fe",
    productIds: ["apple-iphone-16-pro", "samsung-galaxy-s24-fe"],
    options: {},
  },
  {
    name: "single_product",
    productIds: ["lenovo-ideapad-slim-5-14"],
    options: {},
  },
];

const comparisonResults = comparisonCases.map((c) => {
  const prods = c.productIds.map(p);
  return {
    ...c,
    result: compareProducts(prods, c.options),
  };
});

fs.writeFileSync(
  path.join(outDir, "comparisons.json"),
  JSON.stringify(comparisonResults, null, 2),
  "utf-8"
);

console.log(
  `Exported: ${products.length} products, ${queryResults.length} queries, ${comparisonResults.length} comparisons`
);
