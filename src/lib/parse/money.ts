/**
 * Budget parser for South-Asian phrasing, used by the mock agent's intent parser.
 *
 * Understands:
 *   - multipliers: "1 lakh 20 thousand", "1 lakh 20", "1.2 lakh/lakhs/lac/L", "120k", "2 crore/cr", "50 hajar"
 *   - grouping: Indian "1,20,000" and Western "120,000"
 *   - currency: "Rs", "Rs.", "NPR", "रु", "रू", and Devanagari digits (१,२०,०००)
 *   - bounds: under/below/within/max/up to/less than… (max); above/over/at least/min… (min)
 *   - ranges: "between 50k and 80k", "50-80k", "1 to 1.5 lakh"
 *
 * Spec-like numbers ("16GB", "i7-1355U", "S24", "14 inch", "10 hours") are ignored.
 */

export interface Budget {
  min?: number;
  max?: number;
}

const MULTIPLIER: Record<string, number> = {
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  lacs: 1e5,
  l: 1e5,
  crore: 1e7,
  crores: 1e7,
  cr: 1e7,
  k: 1e3,
  thousand: 1e3,
  hajar: 1e3,
  hazar: 1e3,
  hundred: 100,
};

const NUM = String.raw`\d+(?:,\d+)*(?:\.\d+)?(?![\d])`;
const UNIT = String.raw`lakhs?|lacs?|crores?|cr(?![a-z])|l(?![a-z])|k(?![a-z])|thousand|hajar|hazar`;
const SUB_UNIT = String.raw`thousand|k(?![a-z])|hajar|hazar|hundred`;
const CURRENCY = String.raw`rs\.?|npr|रु\.?|रू\.?`;
/** Units that mark a number as a spec, not a price. */
const SPEC_SUFFIX = String.raw`\s*(?:gb|tb|mb|ghz|hz|mah|mp|w(?![a-z])|kg|g(?![a-z])|grams?|h(?![a-z])|hrs?|hours?|inch|"|″|%|x(?![a-z])|cores?|nits|nm|years?|yrs?|months?)`;

const AMOUNT_RE = new RegExp(
  String.raw`(?<![\w.])(?<cur>(?:${CURRENCY})\s*)?(?<num>${NUM})\s*(?<unit>${UNIT})?(?:\s*(?:and\s+)?(?<num2>${NUM})\s*(?<unit2>${SUB_UNIT})?)?(?!${SPEC_SUFFIX})(?![a-z])`,
  "giud",
);

const MAX_WORDS = /(under|below|within|max(?:imum)?|up\s*to|upto|less\s+than|lower\s+than|cheaper\s+than|no\s+more\s+than|not\s+more\s+than|at\s+most|budget(?:\s+(?:of|is))?|tops|<|≤)\s*$/i;
const MIN_WORDS = /(above|over|more\s+than|at\s+least|min(?:imum)?|starting(?:\s+(?:from|at))?|>|≥)\s*$/i;

/** Bare numbers (no currency or unit) only count as prices when this large, or when a bound word precedes them. */
const BARE_MONEY_MIN = 10_000;

interface Candidate {
  value: number;
  unit?: string;
  hasMarker: boolean;
  isMoney: boolean;
  start: number;
  end: number;
}

const DEVANAGARI_ZERO = "०".charCodeAt(0);

function normalize(text: string): string {
  return text
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - DEVANAGARI_ZERO))
    .replace(/[–—]/g, "-")
    .toLowerCase();
}

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function direction(text: string, start: number): "min" | "max" | null {
  const before = text.slice(Math.max(0, start - 40), start);
  if (MAX_WORDS.test(before)) return "max";
  if (MIN_WORDS.test(before)) return "min";
  return null;
}

function candidate(text: string, value: number, unit: string | undefined, hasMarker: boolean, start: number, end: number): Candidate {
  const bounded = direction(text, start) !== null;
  const isMoney = hasMarker || value >= BARE_MONEY_MIN || (bounded && value >= 100);
  return { value: Math.round(value), unit, hasMarker, isMoney, start, end };
}

function candidates(text: string): Candidate[] {
  const out: Candidate[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const g = m.groups ?? {};
    const idx = m.indices?.groups ?? {};
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const unit = g.unit?.toLowerCase();
    const mult = unit ? (MULTIPLIER[unit] ?? 1) : 1;
    const hasMarker = Boolean(g.cur) || Boolean(unit);
    let value = toNumber(g.num) * mult;

    if (g.num2) {
      const n2 = toNumber(g.num2);
      const unit2 = g.unit2?.toLowerCase();
      const m2 = unit2 ? (MULTIPLIER[unit2] ?? 1) : 1;
      // Compound only when the tail is smaller than the head's unit: "1 lakh 20 thousand", "1 lakh 20".
      const compound = unit2 ? n2 * m2 < mult : (mult === 1e5 || mult === 1e7) && n2 < 100;
      if (compound) {
        value += unit2 ? n2 * m2 : n2 * (mult / 100);
      } else {
        // Two separate amounts glued by "and"/whitespace, e.g. "50k and 80k": split them.
        const headEnd = idx.unit?.[1] ?? idx.num?.[1] ?? end;
        const tailStart = idx.num2?.[0] ?? end;
        out.push(candidate(text, value, unit, hasMarker, start, headEnd));
        out.push(candidate(text, n2 * m2, unit2, Boolean(unit2), tailStart, end));
        continue;
      }
    }
    out.push(candidate(text, value, unit, hasMarker, start, end));
  }
  return out;
}

/** Parses a single amount expression such as "1 lakh 20 thousand" or "Rs 1,20,000". */
export function parseAmount(text: string): number | null {
  const c = candidates(normalize(text)).find((x) => x.isMoney);
  return c ? c.value : null;
}

/** Extracts a price budget from free text, or null when no price is mentioned. */
export function parseBudget(input: string): Budget | null {
  const text = normalize(input);
  const list = candidates(text);

  // Ranges: "50-80k", "1 to 1.5 lakh", "between 50k and 80k"
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    const between = text.slice(a.end, b.start);
    const sep = between.match(/^\s*(-|to|and)\s*$/);
    if (!sep || (!b.isMoney && b.value < 1000)) continue;
    if (sep[1] === "and" && !/between\s*$/.test(text.slice(Math.max(0, a.start - 20), a.start))) continue;

    let low = a.value;
    if (!a.hasMarker && b.unit && a.value < 1000) low = a.value * (MULTIPLIER[b.unit] ?? 1); // "1-1.5 lakh"
    else if (!a.isMoney && a.value < 1000) continue;
    return { min: Math.min(low, b.value), max: Math.max(low, b.value) };
  }

  const budget: Budget = {};
  for (const c of list) {
    if (!c.isMoney) continue;
    const dir = direction(text, c.start);
    if (dir === "min" && budget.min === undefined) budget.min = c.value;
    else if (dir === "max" && budget.max === undefined) budget.max = c.value;
    else if (dir === null && budget.max === undefined) budget.max = c.value; // bare amount reads as a budget ceiling
  }
  return budget.min === undefined && budget.max === undefined ? null : budget;
}
