import fs from "node:fs";
import path from "node:path";
import { TOOLS } from "../src/lib/agent/tools";

const outDir = path.resolve(__dirname, "../backend/tests/fixtures");
fs.mkdirSync(outDir, { recursive: true });

const toolsManifest = Object.entries(TOOLS).map(([name, def]) => ({
  name,
  description: def.description,
  mutation: Boolean(def.mutation),
}));

const sampleSummaries = [
  { tool: "search_products", output: { total: 0, searched: 12 }, expected: "0 results of 12" },
  { tool: "search_products", output: { total: 1, searched: 12 }, expected: "1 result of 12" },
  { tool: "search_products", output: { total: 5, searched: 12 }, expected: "5 results of 12" },
  { tool: "get_product", output: { brand: "Lenovo", name: "IdeaPad Slim 5" }, expected: "Lenovo IdeaPad Slim 5" },
  { tool: "compare_products", output: { productIds: ["a", "b"], winnerId: "a" }, expected: "2 products · winner found" },
  { tool: "compare_products", output: { productIds: ["a", "b", "c"], winnerId: null }, expected: "3 products · close call" },
  { tool: "check_stock", output: { productId: "p1", inStock: true, quantity: 4 }, expected: "in stock (4)" },
  { tool: "check_stock", output: { productId: "p1", inStock: false, quantity: 0 }, expected: "out of stock" },
  { tool: "get_delivery_info", output: { city: "Kathmandu", days: "1-2 days" }, expected: "Kathmandu · 1-2 days" },
  { tool: "add_to_cart", output: { cart: {} }, expected: "Added to cart, stock confirmed" },
  { tool: "remove_from_cart", output: { cart: {} }, expected: "Removed from cart" },
  { tool: "get_cart", output: { itemCount: 1, subtotal: 120000 }, expected: "1 item · NPR 1,20,000" },
  { tool: "get_cart", output: { itemCount: 3, subtotal: 450000 }, expected: "3 items · NPR 4,50,000" },
];

const errorSummaries: Record<string, string> = {
  OUT_OF_STOCK: "out of stock",
  NOT_FOUND: "not found",
  TRANSIENT: "service unavailable",
  INVALID_INPUT: "invalid request",
};

const fixture = {
  tools: toolsManifest,
  sampleSummaries,
  errorSummaries,
  transientErrorMessage: "Store service unavailable.",
};

fs.writeFileSync(
  path.join(outDir, "tools_schema.json"),
  JSON.stringify(fixture, null, 2),
  "utf-8"
);

console.log(`Exported tools schema contract with ${toolsManifest.length} tools.`);
