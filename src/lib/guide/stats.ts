import { getAllProducts } from "@/lib/commerce/catalog";
import type { Category, Product } from "@/lib/commerce/schemas";

/** Catalog statistics for Pip's tips. Every number a tip quotes comes from here. */

const all = () => getAllProducts();

export function inCategory(category: Category): Product[] {
  return all().filter((p) => p.category === category);
}

export function countByCategory(): Record<Category, number> {
  const out = { laptops: 0, phones: 0, headphones: 0, accessories: 0, clothing: 0 } as Record<Category, number>;
  for (const p of all()) out[p.category]++;
  return out;
}

/** % of the *other* products in the category for which `cmp(other)` holds. */
function pctOthers(p: Product, cmp: (o: Product) => boolean | undefined): number | null {
  const others = inCategory(p.category).filter((o) => o.id !== p.id);
  const comparable = others.filter((o) => cmp(o) !== undefined);
  if (comparable.length < 3) return null;
  return Math.round((comparable.filter((o) => cmp(o)).length / comparable.length) * 100);
}

export const lighterThanPct = (p: Product) => pctOthers(p, (o) => o.specs.weightGrams > p.specs.weightGrams);
export const cheaperThanPct = (p: Product) => pctOthers(p, (o) => o.price > p.price);
export const longerBatteryThanPct = (p: Product) =>
  p.specs.batteryHours === undefined ? null : pctOthers(p, (o) => (o.specs.batteryHours === undefined ? undefined : o.specs.batteryHours < p.specs.batteryHours!));
export const moreRamThanPct = (p: Product) =>
  p.specs.ramGB === undefined ? null : pctOthers(p, (o) => (o.specs.ramGB === undefined ? undefined : o.specs.ramGB < p.specs.ramGB!));

export function countWhere(category: Category, pred: (p: Product) => boolean): number {
  return inCategory(category).filter(pred).length;
}

const roundK = (n: number) => Math.round(n / 1000) * 1000;

export function priceSpread(category: Category | null) {
  const prices = (category ? inCategory(category) : all()).map((p) => p.price).sort((a, b) => a - b);
  const q = (f: number) => prices[Math.min(prices.length - 1, Math.max(0, Math.round(f * (prices.length - 1))))];
  return { min: prices[0], max: prices[prices.length - 1], q1: roundK(q(0.25)), median: roundK(q(0.5)), q3: roundK(q(0.75)) };
}

export function brandStats(category: Category | null) {
  const list = category ? inCategory(category) : all();
  const counts = new Map<string, number>();
  for (const p of list) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  const [topBrand, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return { brands: counts.size, topBrand, topCount };
}

export function maxWarrantyMonths(category: Category): number {
  return Math.max(...inCategory(category).map((p) => p.specs.warrantyMonths));
}

/** "14 cores / 18 threads" from a CPU string like "Intel Core Ultra 5 125H (14C/18T)". */
export function coreThreads(cpu: string | undefined): { cores: number; threads: number } | null {
  const m = cpu?.match(/\((\d+)C\/(\d+)T\)/);
  return m ? { cores: Number(m[1]), threads: Number(m[2]) } : null;
}

export const isDedicatedGpu = (gpu: string | undefined) => !!gpu && /rtx|gtx|radeon rx/i.test(gpu);
