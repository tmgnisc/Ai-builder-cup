import { getAllProducts, getProduct } from "@/lib/commerce/catalog";
import type { CompareKey } from "@/lib/commerce/compare";
import type { Category, Product } from "@/lib/commerce/schemas";
import { parseBudget } from "@/lib/parse/money";
import type { ParsedQuery } from "./types";

/**
 * Rule-based language understanding for the mock agent: intent classification,
 * structured query extraction (category, budget, needs → filters + priorities) and
 * references ("the first two", "the lighter one", "it", product names).
 * Pure and deterministic, so it is unit-tested directly.
 */

export type Ref =
  | { kind: "ordinal"; index: number } // first / 2nd / last (-1)
  | { kind: "first_n"; count: number } // first two / top 3
  | { kind: "superlative"; attr: CompareKey } // lighter / cheaper / better battery
  | { kind: "names"; productIds: string[] }
  | { kind: "brand"; brand: string }
  | { kind: "pronoun" } // it / this / that one
  | { kind: "all" } // them / both / these
  | { kind: "suggested" } // instead / the alternative
  | { kind: "winner" }; // the better one / your pick

export type Intent =
  | { kind: "greet" }
  | { kind: "thanks" }
  | { kind: "help" }
  | { kind: "checkout" }
  | { kind: "cart" }
  | { kind: "retry" }
  | { kind: "add"; ref: Ref | null; qty: number }
  | { kind: "remove"; ref: Ref | null }
  | { kind: "compare"; ref: Ref | null }
  | { kind: "add_compare"; ref: Ref | null }
  | { kind: "remove_compare"; ref: Ref | null }
  | { kind: "similar"; ref: Ref | null; cheaper: boolean }
  | { kind: "delivery"; city: string | null }
  | { kind: "question"; ref: Ref | null; topic: Topic }
  | { kind: "search"; query: ParsedQuery; refinement: boolean }
  | { kind: "unknown" };

export type Topic = "battery" | "weight" | "ram" | "gaming" | "warranty" | "price" | "stock" | "screen" | "storage" | "general";

// ───────────────────────── Normalisation ─────────────────────────

export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9.,'+₹रु\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

const has = (t: string, re: RegExp) => re.test(t);

// ───────────────────────── Product mentions ─────────────────────────

/** Words that are product names but also ordinary English; never treated as a mention alone. */
const AMBIGUOUS_WORDS = new Set(["modern", "phone", "tune", "liberty", "momentum", "swift", "victus", "nexode", "galaxy", "macbook", "iphone"]);

interface Alias {
  id: string;
  alias: string;
}

function buildAliases(products: readonly Product[]): Alias[] {
  const firstWordCount = new Map<string, number>();
  const clean = (s: string) => normalize(s.replace(/\(.*?\)/g, " ")).trim();
  for (const p of products) {
    const w = clean(p.name).split(" ")[0];
    firstWordCount.set(w, (firstWordCount.get(w) ?? 0) + 1);
  }
  const out: Alias[] = [];
  for (const p of products) {
    const name = clean(p.name);
    const words = name.split(" ");
    const set = new Set<string>([name, clean(`${p.brand} ${p.name}`), clean(`${p.brand} ${words[0]}`)]);
    if (words.length >= 2) set.add(words.slice(0, 2).join(" "));
    // Parenthesised variants: "MacBook Air 13" (M3)" → "macbook air m3"
    const paren = p.name.match(/\((.*?)\)/)?.[1];
    if (paren) set.add(clean(`${words.slice(0, 2).join(" ")} ${paren}`));
    if (firstWordCount.get(words[0]) === 1 && words[0].length >= 4 && !AMBIGUOUS_WORDS.has(words[0])) set.add(words[0]);
    // Also support exact product ID and space-separated ID
    set.add(clean(p.id));
    set.add(clean(p.id.replace(/-/g, " ")));
    for (const a of set) if (a.length >= 4 && !AMBIGUOUS_WORDS.has(a)) out.push({ id: p.id, alias: a });
  }
  return out;
}

const ALIASES = buildAliases(getAllProducts());
const BRANDS = [...new Set(getAllProducts().map((p) => p.brand.toLowerCase()))];

/** Product ids mentioned by name, longest alias wins on overlaps ("iPhone 16 Pro" beats "iPhone 16"). */
export function findProductMentions(text: string): string[] {
  const t = normalize(text);
  const spans: { id: string; start: number; end: number }[] = [];
  for (const { id, alias } of ALIASES) {
    let from = 0;
    for (;;) {
      const i = t.indexOf(` ${alias}`, from);
      if (i === -1) break;
      const end = i + alias.length + 1;
      // must end at a word boundary
      if (!/[a-z0-9]/.test(t[end] ?? " ")) spans.push({ id, start: i + 1, end });
      from = i + 1;
    }
  }
  const kept = spans.filter((s) => !spans.some((o) => o !== s && o.start <= s.start && o.end >= s.end && o.end - o.start > s.end - s.start && o.id !== s.id));
  kept.sort((a, b) => a.start - b.start);
  return [...new Set(kept.map((s) => s.id))];
}

// ───────────────────────── References ─────────────────────────

const ORDINALS: Record<string, number> = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, last: -1 };
const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, "2": 2, "3": 3 };

const SUPERLATIVES: [RegExp, CompareKey][] = [
  [/\b(lighter|lightest|less heavy|weighs less|lighter weight)\b/, "weight"],
  [/\b(cheaper|cheapest|less expensive|more affordable|most affordable|lower price|budget one)\b/, "price"],
  [/\b(better|longer|bigger|best|longest) battery|\bmore battery\b|\blasts longer\b/, "battery"],
  [/\bmore (ram|memory)\b|\b(most|bigger) (ram|memory)\b/, "ram"],
  [/\bmore storage\b|\bbigger (ssd|storage)\b|\bmost storage\b/, "storage"],
  [/\b(better|higher|best|top) rated\b/, "rating"],
  [/\blonger warranty\b/, "warranty"],
];

export function parseRef(text: string): Ref | null {
  const t = normalize(text);
  const names = findProductMentions(text);
  if (names.length) return { kind: "names", productIds: names };

  const firstN = t.match(/\b(?:first|top) (two|three|2|3)\b/);
  if (firstN) return { kind: "first_n", count: NUMBER_WORDS[firstN[1]] };

  for (const [re, attr] of SUPERLATIVES) if (re.test(t)) return { kind: "superlative", attr };

  if (has(t, /\b(instead|the alternative|that alternative|your suggestion)\b/)) return { kind: "suggested" };
  if (has(t, /\b(winner|better one|better fit|your pick|the best one|recommended one|one you recommend)\b/)) return { kind: "winner" };

  const ord = t.match(/\b(first|1st|second|2nd|third|3rd|last)\b(?! two| three| 2| 3)/);
  if (ord) return { kind: "ordinal", index: ORDINALS[ord[1]] };
  const num = t.match(/\b(?:number|no\.?|option|#) ?([1-3])\b/);
  if (num) return { kind: "ordinal", index: Number(num[1]) - 1 };

  if (has(t, /\b(them|both|these|those|all of them|the two|these two|those two|all three)\b/)) return { kind: "all" };

  const brand = BRANDS.find((b) => t.includes(` ${b} `));
  if (brand) return { kind: "brand", brand };

  if (has(t, /\b(it|this|that|this one|that one)\b/)) return { kind: "pronoun" };
  return null;
}

/** Resolves a reference against a candidate list (usually the last results or compared items). */
export function resolveRef(
  ref: Ref | null,
  candidates: string[],
  opts: { focusId?: string | null; suggestedId?: string | null; winnerId?: string | null; pageProductId?: string | null } = {},
): string[] {
  const pool = candidates.map(getProduct).filter((p): p is Product => !!p);
  if (!ref) return [];
  switch (ref.kind) {
    case "names":
      return ref.productIds;
    case "first_n":
      return candidates.slice(0, ref.count);
    case "ordinal": {
      const id = ref.index === -1 ? candidates[candidates.length - 1] : candidates[ref.index];
      return id ? [id] : [];
    }
    case "all":
      return candidates;
    case "suggested":
      return opts.suggestedId ? [opts.suggestedId] : [];
    case "winner":
      return opts.winnerId ? [opts.winnerId] : candidates.slice(0, 1);
    case "brand": {
      const hits = pool.filter((p) => p.brand.toLowerCase() === ref.brand);
      return hits.length === 1 ? [hits[0].id] : hits.map((p) => p.id);
    }
    case "pronoun": {
      const id = opts.focusId ?? opts.pageProductId ?? (candidates.length === 1 ? candidates[0] : undefined);
      return id ? [id] : [];
    }
    case "superlative": {
      const value: Record<CompareKey, (p: Product) => number | undefined> = {
        weight: (p) => -p.specs.weightGrams,
        price: (p) => -p.price,
        battery: (p) => p.specs.batteryHours,
        ram: (p) => p.specs.ramGB,
        storage: (p) => p.specs.storageGB,
        rating: (p) => p.rating,
        warranty: (p) => p.specs.warrantyMonths,
      };
      const scored = pool.map((p) => ({ p, v: value[ref.attr](p) })).filter((x): x is { p: Product; v: number } => x.v !== undefined);
      if (!scored.length) return [];
      scored.sort((a, b) => b.v - a.v);
      return [scored[0].p.id];
    }
  }
}

// ───────────────────────── Query extraction ─────────────────────────

const CATEGORY_WORDS: [RegExp, Category][] = [
  [/\b(laptops?|notebooks?|macbooks?|ultrabooks?|thinkpads?|computers?|pc)\b/, "laptops"],
  [/\b(phones?|smartphones?|mobiles?|iphones?|android|handsets?)\b/, "phones"],
  [/\b(headphones?|earbuds?|earphones?|airpods|headsets?|buds|over-ear|iems?)\b/, "headphones"],
  [/\b(cloth(es|ing)|outfits?|wear|t-?shirts?|tees?|shirts?|polos?|hoodies?|jackets?|puffers?|denim|kurtas?|topis?|caps?|hats?|sunglasses|shades|shawls?|pashminas?|scarf|scarves)\b/, "clothing"],
  [/\b(mouse|mice|keyboards?|chargers?|power ?banks?|ssd|drives?|monitors?|accessor(y|ies)|adapters?|cables?)\b/, "accessories"],
];

const DEFAULT_BATTERY: Record<Category, number> = { laptops: 8, phones: 24, headphones: 30, accessories: 8, clothing: 0 };

export function detectCategory(text: string): Category | undefined {
  const t = normalize(text);
  for (const [re, c] of CATEGORY_WORDS) if (re.test(t)) return c;
  return undefined;
}

export function parseQuery(text: string): ParsedQuery {
  const t = normalize(text);
  let category = detectCategory(text);
  const needs: string[] = [];
  const priorities: CompareKey[] = [];
  const tags: string[] = [];
  const q: ParsedQuery = { needs, priorities };
  const prio = (k: CompareKey) => !priorities.includes(k) && priorities.push(k);

  const budget = parseBudget(text);
  if (budget?.max !== undefined) q.maxPrice = budget.max;
  if (budget?.min !== undefined) q.minPrice = budget.min;

  if (has(t, /\bfull[- ]?stack\b/)) needs.push("full-stack development");
  else if (has(t, /\b(web dev\w*|develop(er|ment|ing)?|coding|code|programm\w*|software)\b/)) needs.push("development");

  if (has(t, /\b(docker|containers?|kubernetes|k8s|virtual machines?|vms?)\b/)) {
    needs.push("Docker");
    q.minRamGB = Math.max(q.minRamGB ?? 0, 16);
  }
  if (has(t, /\b(enough|lots of|plenty of|more|good amount of) (ram|memory)\b/)) q.minRamGB = Math.max(q.minRamGB ?? 0, 16);
  const ramN = t.match(/\b(\d{1,2}) ?gb (?:of )?(?:ram|memory)\b/);
  if (ramN) q.minRamGB = Number(ramN[1]);
  if (needs.includes("full-stack development") && q.minRamGB === undefined) q.minRamGB = 16;
  if (q.minRamGB !== undefined || needs.some((n) => /development/.test(n))) prio("ram");

  if (has(t, /\b(good|long|great|all[- ]day|decent|strong|solid|best|long-lasting) battery\b|\bbattery life\b|\blasts? all day\b/)) {
    needs.push("good battery");
    prio("battery");
    const hrs = t.match(/\b(\d{1,2}) ?(?:h|hrs?|hours?)\b/);
    q.minBatteryHours = hrs ? Number(hrs[1]) : DEFAULT_BATTERY[category ?? "laptops"];
  }

  if (has(t, /\b(travel\w*|portable|lightweight|light|carry|commut\w*)\b/) && !has(t, /\blight gaming\b/)) {
    needs.push("travel");
    prio("weight");
    if ((category ?? "laptops") === "laptops") q.maxWeightGrams = 1500;
  }
  if (has(t, /\b(gaming|games?|gamer)\b/)) {
    needs.push("gaming");
    tags.push("gaming");
  }
  if (has(t, /\b(camera|photos?|photography|selfies?)\b/) && category !== "laptops") {
    needs.push("camera");
    tags.push("camera");
    category ??= "phones";
  }
  if (has(t, /\b(noise[- ]?cancel\w*|anc|flights?|plane|quiet)\b/)) {
    needs.push("noise cancelling");
    tags.push("anc");
    category ??= "headphones";
  }
  if (has(t, /\b(cheap|cheaper|cheapest|budget|affordable|inexpensive|value)\b/)) {
    needs.push("value");
    q.sort = "price-asc";
  }
  if (has(t, /\b(top|best|highest) rated\b/)) {
    q.sort = "rating";
    prio("rating");
  }
  if (q.maxPrice !== undefined) prio("price");

  if (category) q.category = category;
  if (tags.length) q.tags = tags;
  const brands = BRANDS.filter((b) => t.includes(` ${b} `));
  if (brands.length) q.brands = brands.map((b) => getAllProducts().find((p) => p.brand.toLowerCase() === b)!.brand);
  if (q.minBatteryHours !== undefined && category && !t.match(/\b\d{1,2} ?(?:h|hrs?|hours?)\b/)) q.minBatteryHours = DEFAULT_BATTERY[category];
  return q;
}

/** Short label for verdict context: "full-stack development + Docker". */
export function needsLabel(q: ParsedQuery | null | undefined): string | undefined {
  if (!q || q.needs.length === 0) return undefined;
  return q.needs.slice(0, 2).join(" + ");
}

export function hasConstraints(q: ParsedQuery): boolean {
  return (
    q.category !== undefined ||
    q.maxPrice !== undefined ||
    q.minPrice !== undefined ||
    q.minRamGB !== undefined ||
    q.minBatteryHours !== undefined ||
    q.maxWeightGrams !== undefined ||
    (q.tags?.length ?? 0) > 0 ||
    (q.brands?.length ?? 0) > 0
  );
}

/** Merge a follow-up ("cheaper ones", "under 80k instead", "with more battery") into the previous query. */
export function mergeQuery(prev: ParsedQuery, next: ParsedQuery): ParsedQuery {
  const merged: ParsedQuery = { ...prev, ...Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) } as ParsedQuery;
  merged.needs = [...new Set([...prev.needs, ...next.needs])];
  merged.priorities = [...new Set([...next.priorities, ...prev.priorities])];
  merged.tags = [...new Set([...(prev.tags ?? []), ...(next.tags ?? [])])];
  if (!merged.tags.length) delete merged.tags;
  return merged;
}

// ───────────────────────── Intent ─────────────────────────

const CITIES = ["kathmandu", "lalitpur", "patan", "bhaktapur", "kirtipur", "pokhara", "biratnagar", "chitwan", "bharatpur", "butwal", "dharan", "birgunj", "hetauda", "nepalgunj", "janakpur", "itahari", "dhangadhi"];

function detectTopic(t: string): Topic {
  if (/\bbattery|charge|last\b/.test(t)) return "battery";
  if (/\b(heavy|weight|weigh|light|portable)\b/.test(t)) return "weight";
  if (/\b(ram|memory|docker|containers?|multitask\w*)\b/.test(t)) return "ram";
  if (/\b(gaming|games?|gpu|graphics)\b/.test(t)) return "gaming";
  if (/\bwarranty|guarantee\b/.test(t)) return "warranty";
  if (/\b(price|cost|how much|expensive|cheap)\b/.test(t)) return "price";
  if (/\b(stock|available|availability)\b/.test(t)) return "stock";
  if (/\b(screen|display|oled|resolution)\b/.test(t)) return "screen";
  if (/\b(storage|ssd|space)\b/.test(t)) return "storage";
  return "general";
}

export function parseIntent(
  text: string,
  opts: { hasPreviousQuery?: boolean; onCompare?: boolean } = {},
): Intent {
  const t = normalize(text);
  const words = t.trim().split(" ").length;

  if (has(t, /^ (try again|retry|again|one more time) $/)) return { kind: "retry" };
  if (has(t, /\b(check ?out|place (the |an |my )?order|make (the )?payment|pay now|pay for)\b/)) return { kind: "checkout" };

  const isCompareAdd =
    has(t, /\b(add|put|include|compare)\b.*\b(to compare|to comparison|in compare|in comparison|as well|too)\b/) ||
    has(t, /\b(compare)\b.*\b(too|as well)\b/) ||
    (opts.onCompare && has(t, /\b(add|include|put)\b/) && !has(t, /\b(cart|basket|buy)\b/));

  if (isCompareAdd) {
    return { kind: "add_compare", ref: parseRef(text) };
  }

  const isCompareRemove =
    has(t, /\b(remove|delete|take out|drop|get rid of)\b.*\b(from compare|from comparison|out of compare|out of comparison)\b/) ||
    (opts.onCompare && has(t, /\b(remove|delete|take out|drop)\b/) && !has(t, /\b(cart|basket)\b/));

  if (isCompareRemove) {
    return { kind: "remove_compare", ref: parseRef(text) };
  }

  const qtyMatch = t.match(/\b(two|2|three|3) (of (them|those|these)|units?|pieces?)\b/);
  const qty = qtyMatch ? (NUMBER_WORDS[qtyMatch[1]] ?? 1) : 1;

  if (has(t, /\b(remove|delete|take out|drop|get rid of)\b/)) return { kind: "remove", ref: parseRef(text) };
  if (has(t, /\b(add|put|throw|i'?ll take|i will take|get me|grab|buy|order)\b/) && !has(t, /\bwhat should i (buy|get)\b/))
    return { kind: "add", ref: parseRef(text), qty };
  if (has(t, /\b(compare|comparison|vs\.?|versus|difference|side by side|which (one )?(is|would be) better|which should i (get|pick|choose))\b/))
    return { kind: "compare", ref: parseRef(text) };
  if (has(t, /\b(similar|alternatives?|something like|other options like)\b/))
    return { kind: "similar", ref: parseRef(text), cheaper: has(t, /\b(cheaper|less expensive|lower price|budget)\b/) };
  if (has(t, /\b(my cart|in (my |the )?cart|cart total|show (me )?(the )?cart|what'?s in|my basket)\b/)) return { kind: "cart" };
  if (has(t, /\b(deliver\w*|shipping|ship to|arrive|dispatch)\b/)) {
    return { kind: "delivery", city: CITIES.find((c) => t.includes(` ${c} `)) ?? null };
  }
  if (words <= 4 && has(t, /^ (hi|hey|hello|namaste|yo|hiya|good (morning|evening|afternoon))\b/)) return { kind: "greet" };
  if (words <= 6 && has(t, /\b(thanks|thank you|thx|cheers|great|perfect|awesome)\b/) && !detectCategory(text)) return { kind: "thanks" };
  if (has(t, /\b(what can you do|help me\b|how does this work|who are you)\b/) || t.trim() === "help") return { kind: "help" };

  const query = parseQuery(text);
  const ref = parseRef(text);
  const questionish = has(t, /\?|^ (is|does|do|can|how|what|will|would|should|tell me about)\b|\bgood for\b|\babout (it|this|that)\b/);
  if (questionish && ref && (ref.kind !== "brand" || !query.category) && !(query.category && ref.kind !== "names" && ref.kind !== "pronoun")) {
    return { kind: "question", ref, topic: detectTopic(t) };
  }

  const refinement =
    !!opts.hasPreviousQuery &&
    !query.category &&
    (has(t, /^ (and|also|only|just|what about|how about|with|under|below|more|less|show (me )?more|any)\b/) ||
      has(t, /\b(cheaper|lighter|less expensive|raise|increase|stretch|bigger budget|higher budget)\b/) ||
      hasConstraints(query));
  if (refinement || hasConstraints(query) || query.needs.length || has(t,/\b(find|show|looking for|need|want|recommend|suggest|search|options?|best)\b/)) {
    if (!hasConstraints(query) && !query.needs.length && !refinement) return { kind: "unknown" };
    return { kind: "search", query, refinement };
  }
  return { kind: "unknown" };
}
