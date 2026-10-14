import type { Product } from "./schemas";

const npr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** NPR with South-Asian digit grouping: 120000 → "NPR 1,20,000". */
export function formatNPR(amount: number, { prefix = true }: { prefix?: boolean } = {}): string {
  const n = npr.format(Math.round(amount));
  return prefix ? `NPR ${n}` : n;
}

export function formatWeight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2).replace(/\.?0+$/, "")} kg` : `${grams} g`;
}

export function formatStorage(gb: number): string {
  return gb >= 1000 ? `${Math.round(gb / 1000)} TB` : `${gb} GB`;
}

export function formatWarranty(months: number): string {
  if (months === 0) return "None";
  return months % 12 === 0 ? `${months / 12} yr` : `${months} mo`;
}

export type StockLevel = "in" | "low" | "out";

export function stockLevel(stock: number): StockLevel {
  if (stock === 0) return "out";
  if (stock <= 3) return "low";
  return "in";
}

export function stockLabel(stock: number): string {
  const level = stockLevel(stock);
  if (level === "out") return "Out of stock";
  if (level === "low") return `Only ${stock} left`;
  return "In stock";
}

export interface SpecItem {
  key: string;
  label: string;
  value: string;
}

/** Ordered, human-readable spec rows. Values always come straight from catalog data. */
export function specRows(p: Product): SpecItem[] {
  const s = p.specs;
  const rows: (SpecItem | null)[] = [
    s.cpu ? { key: "cpu", label: p.category === "phones" ? "Chip" : "Processor", value: s.cpu } : null,
    s.ramGB ? { key: "ram", label: "Memory", value: `${s.ramGB} GB` } : null,
    s.storageGB ? { key: "storage", label: "Storage", value: formatStorage(s.storageGB) } : null,
    s.gpu ? { key: "gpu", label: "Graphics", value: s.gpu } : null,
    s.screen ? { key: "screen", label: "Display", value: s.screen } : null,
    s.camera ? { key: "camera", label: "Camera", value: s.camera } : null,
    s.batteryHours ? { key: "battery", label: "Battery", value: `${s.batteryHours} h` } : null,
    s.anc !== undefined ? { key: "anc", label: "Noise cancelling", value: s.anc ? "Yes" : "No" } : null,
    { key: "weight", label: "Weight", value: formatWeight(s.weightGrams) },
    s.ports ? { key: "ports", label: "Ports", value: s.ports } : null,
    s.connectivity ? { key: "connectivity", label: "Connectivity", value: s.connectivity } : null,
    { key: "warranty", label: "Warranty", value: formatWarranty(s.warrantyMonths) },
  ];
  return rows.filter((r): r is SpecItem => r !== null);
}

/** Three headline specs for cards, chosen per category. */
export function keySpecs(p: Product): SpecItem[] {
  const all = specRows(p);
  const pick: Record<Product["category"], string[]> = {
    laptops: ["ram", "battery", "weight"],
    phones: ["storage", "battery", "screen"],
    headphones: ["battery", "anc", "weight"],
    accessories: ["ports", "connectivity", "weight"],
  };
  const wanted = pick[p.category];
  const chosen = wanted.map((k) => all.find((r) => r.key === k)).filter((r): r is SpecItem => !!r);
  // Fill up to three from remaining rows if a category item lacks a preferred spec.
  for (const r of all) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(r)) chosen.push(r);
  }
  return chosen.slice(0, 3);
}

export function initials(p: Pick<Product, "brand" | "name">): string {
  const words = `${p.brand} ${p.name}`.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}
