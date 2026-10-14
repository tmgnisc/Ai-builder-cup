import { formatNPR, formatStorage, formatWarranty, formatWeight } from "./format";
import type { Product } from "./schemas";

/**
 * Deterministic, catalog-grounded comparison. Every value and every sentence fragment
 * is derived from product data; nothing is generated. Shared by the compare drawer and
 * (Phase 4) the `compare_products` agent tool.
 */

export type CompareKey = "price" | "ram" | "storage" | "battery" | "weight" | "warranty" | "rating";
export type TextKey = "cpu" | "gpu" | "screen" | "ports" | "connectivity" | "camera";

interface NumericAttr {
  key: CompareKey;
  label: string;
  better: "lower" | "higher";
  get: (p: Product) => number | undefined;
  format: (v: number) => string;
  /** Advantage phrase for the winner, e.g. "2 h more battery". */
  phrase: (best: number, other: number) => string;
  /** Verb that turns the phrase into a predicate: "is 140 g lighter", "has 2 h more battery". */
  verb: "is" | "has";
  /** Minimum difference that counts as a real advantage. */
  epsilon: number;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

export const NUMERIC_ATTRS: NumericAttr[] = [
  {
    key: "price",
    verb: "is",
    label: "Price",
    better: "lower",
    get: (p) => p.price,
    format: (v) => formatNPR(v),
    phrase: (best, other) => `${formatNPR(other - best)} cheaper`,
    epsilon: 500,
  },
  {
    key: "ram",
    verb: "has",
    label: "Memory",
    better: "higher",
    get: (p) => p.specs.ramGB,
    format: (v) => `${v} GB`,
    phrase: (best, other) => (ratio(best, other) >= 2 ? "double the RAM" : `${best - other} GB more RAM`),
    epsilon: 1,
  },
  {
    key: "storage",
    verb: "has",
    label: "Storage",
    better: "higher",
    get: (p) => p.specs.storageGB,
    format: formatStorage,
    phrase: (best, other) => (ratio(best, other) >= 2 ? "double the storage" : `${formatStorage(best - other)} more storage`),
    epsilon: 1,
  },
  {
    key: "battery",
    verb: "has",
    label: "Battery",
    better: "higher",
    get: (p) => p.specs.batteryHours,
    format: (v) => `${v} h`,
    phrase: (best, other) => `${+(best - other).toFixed(1)} h more battery`,
    epsilon: 0.5,
  },
  {
    key: "weight",
    verb: "is",
    label: "Weight",
    better: "lower",
    get: (p) => p.specs.weightGrams,
    format: formatWeight,
    phrase: (best, other) => `${formatWeight(other - best)} lighter`,
    epsilon: 20,
  },
  {
    key: "warranty",
    verb: "has",
    label: "Warranty",
    better: "higher",
    get: (p) => p.specs.warrantyMonths,
    format: formatWarranty,
    phrase: (best, other) => `${formatWarranty(best - other)} longer warranty`,
    epsilon: 1,
  },
  {
    key: "rating",
    verb: "is",
    label: "Rating",
    better: "higher",
    get: (p) => p.rating,
    format: (v) => `${v.toFixed(1)} ★`,
    phrase: (best, other) => `better rated (${best.toFixed(1)} vs ${other.toFixed(1)})`,
    epsilon: 0.15,
  },
];

const TEXT_ATTRS: { key: TextKey; label: string }[] = [
  { key: "cpu", label: "Processor" },
  { key: "gpu", label: "Graphics" },
  { key: "screen", label: "Display" },
  { key: "camera", label: "Camera" },
  { key: "ports", label: "Ports" },
  { key: "connectivity", label: "Connectivity" },
];

const SAME_LABEL: Record<CompareKey, string> = {
  price: "same price",
  ram: "same RAM",
  storage: "same storage",
  battery: "same battery life",
  weight: "same weight",
  warranty: "same warranty",
  rating: "same rating",
};

export interface CompareRow {
  key: CompareKey | TextKey;
  label: string;
  /** Formatted value per product id ("—" when missing). */
  values: Record<string, string>;
  /** Product ids holding the best value (empty when all equal or not comparable). */
  winners: string[];
  numeric: boolean;
}

export interface CompareResult {
  productIds: string[];
  rows: CompareRow[];
  /** Advantages of each product over the best of the others, in priority order. */
  advantages: Record<string, string[]>;
  scores: Record<string, number>;
  /** Id of the better overall fit, or null when it's a genuine tie. */
  winnerId: string | null;
  verdict: string;
}

export const DEFAULT_PRIORITIES: CompareKey[] = ["price", "battery", "weight", "ram"];

function shortName(p: Product): string {
  return p.name.length <= 22 ? p.name : `${p.brand} ${p.name.split(" ")[0]}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function compareProducts(
  products: Product[],
  { priorities = DEFAULT_PRIORITIES, context }: { priorities?: CompareKey[]; context?: string } = {},
): CompareResult {
  const ids = products.map((p) => p.id);
  const rows: CompareRow[] = [];
  const advantages: Record<string, { key: CompareKey; text: string; predicate: string; weight: number }[]> = Object.fromEntries(ids.map((id) => [id, []]));
  const scores: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const sames: CompareKey[] = [];
  const weightOf = (k: CompareKey) => {
    const i = priorities.indexOf(k);
    return i === -1 ? 1 : 3 + (priorities.length - i) * 0.25;
  };

  for (const attr of NUMERIC_ATTRS) {
    const vals = products.map((p) => attr.get(p));
    if (vals.every((v) => v === undefined)) continue;
    const present = vals.filter((v): v is number => v !== undefined);
    const best = attr.better === "lower" ? Math.min(...present) : Math.max(...present);
    const allEqual = present.length === vals.length && present.every((v) => Math.abs(v - best) < attr.epsilon);
    const winners = allEqual ? [] : products.filter((_, i) => vals[i] !== undefined && Math.abs(vals[i]! - best) < attr.epsilon).map((p) => p.id);

    rows.push({
      key: attr.key,
      label: attr.label,
      values: Object.fromEntries(products.map((p, i) => [p.id, vals[i] === undefined ? "—" : attr.format(vals[i]!)])),
      winners,
      numeric: true,
    });

    if (allEqual) {
      if (priorities.includes(attr.key)) sames.push(attr.key);
      continue;
    }
    // Each winner's advantage is measured against the best of the non-winners.
    const losers = vals.filter((v, i): v is number => v !== undefined && !winners.includes(ids[i]));
    if (losers.length === 0) continue;
    const runnerUp = attr.better === "lower" ? Math.min(...losers) : Math.max(...losers);
    for (const id of winners) {
      const own = vals[ids.indexOf(id)]!;
      const text = attr.phrase(own, runnerUp);
      advantages[id].push({ key: attr.key, text, predicate: `${attr.verb} ${text}`, weight: weightOf(attr.key) });
      scores[id] += weightOf(attr.key);
    }
  }

  for (const attr of TEXT_ATTRS) {
    const vals = products.map((p) => p.specs[attr.key]);
    if (vals.every((v) => v === undefined)) continue;
    rows.push({
      key: attr.key,
      label: attr.label,
      values: Object.fromEntries(products.map((p, i) => [p.id, vals[i] ?? "—"])),
      winners: [],
      numeric: false,
    });
  }

  for (const id of ids) advantages[id].sort((a, b) => b.weight - a.weight);

  const ranked = [...ids].sort((a, b) => scores[b] - scores[a]);
  const top = ranked[0];
  const second = ranked[1];
  const tie = !top || !second || Math.abs(scores[top] - scores[second]) < 0.5;
  const winnerId = tie ? null : top;
  const byId = new Map(products.map((p) => [p.id, p]));

  let verdict: string;
  if (products.length < 2) {
    verdict = "Add another product to compare.";
  } else if (!winnerId) {
    const [a, b] = ranked.slice(0, 2).map((id) => byId.get(id)!);
    const preds = (id: string) => advantages[id].slice(0, 2).map((x) => x.predicate);
    const side = (prod: Product) => (preds(prod.id).length ? `the ${shortName(prod)} ${joinList(preds(prod.id))}` : `the ${shortName(prod)} matches it`);
    verdict = `It's a close call: ${side(a)}, while ${side(b)}.`;
  } else {
    const w = byId.get(winnerId)!;
    const reasons = advantages[winnerId].slice(0, 3).map((x) => x.text);
    const sameText = sames.slice(0, 1).map((k) => SAME_LABEL[k]);
    const lead = context ? `For ${context}, the ${shortName(w)} is the better fit` : `The ${shortName(w)} is the better all-round pick`;
    verdict = `${lead}: ${[...reasons, ...sameText].join(", ")}.`;
    const runner = second ? byId.get(second) : undefined;
    const counter = runner ? advantages[runner.id][0]?.predicate : undefined;
    if (runner && counter) verdict += ` The ${shortName(runner)} ${counter}.`;
  }

  return {
    productIds: ids,
    rows,
    advantages: Object.fromEntries(ids.map((id) => [id, advantages[id].map((a) => a.text)])),
    scores,
    winnerId,
    verdict,
  };
}
