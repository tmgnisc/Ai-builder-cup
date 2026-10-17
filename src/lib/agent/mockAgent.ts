import { getAllProducts, getProduct } from "@/lib/commerce/catalog";
import { compareProducts, type CompareKey } from "@/lib/commerce/compare";
import { formatNPR, formatStorage, formatWarranty, formatWeight, stockLabel } from "@/lib/commerce/format";
import type { Category, Product } from "@/lib/commerce/schemas";
import { hasConstraints, mergeQuery, needsLabel, parseIntent, resolveRef, type Intent, type Ref, type Topic } from "./intent";
import type { Agent, AgentIO } from "./runAgent";
import type { ToolInput } from "./tools";
import type { AgentMemory, AgentRequest, ParsedQuery } from "./types";

/**
 * Rule-based agent that emits exactly the events a real LLM agent would: it understands
 * the message (intent.ts), decides, calls tools through the runtime, adapts on failure
 * (retry once, relax filters, suggest alternatives) and only claims success when the
 * runtime's verification says so. All product facts come from tool results / catalog data.
 */

const CATEGORY_LABEL: Record<Category, string> = { laptops: "laptops", phones: "phones", headphones: "headphones", accessories: "accessories" };
const KEY_LABEL: Record<CompareKey, string> = { price: "price", ram: "RAM", storage: "storage", battery: "battery", weight: "weight", warranty: "warranty", rating: "rating" };
const DEFAULT_PRIORITIES: CompareKey[] = ["price", "battery", "weight", "ram"];

const name = (p: Product) => p.name;
const product = (id: string) => getProduct(id);
const products = (ids: string[]) => ids.map(product).filter((p): p is Product => !!p);

function joinList(items: string[], word = "and"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${word} ${items[items.length - 1]}`;
}

/** In-stock first, then a weighted score over the user's priorities. */
function rank(pool: Product[], priorities: CompareKey[]): Product[] {
  const prios = priorities.length ? priorities : DEFAULT_PRIORITIES;
  const get: Record<CompareKey, (p: Product) => number | undefined> = {
    price: (p) => -p.price,
    ram: (p) => p.specs.ramGB,
    storage: (p) => p.specs.storageGB,
    battery: (p) => p.specs.batteryHours,
    weight: (p) => -p.specs.weightGrams,
    warranty: (p) => p.specs.warrantyMonths,
    rating: (p) => p.rating,
  };
  const score = new Map<string, number>();
  prios.forEach((k, i) => {
    const vals = pool.map((p) => get[k](p)).filter((v): v is number => v !== undefined);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    for (const p of pool) {
      const v = get[k](p);
      const norm = v === undefined || hi === lo ? 0.5 : (v - lo) / (hi - lo);
      score.set(p.id, (score.get(p.id) ?? 0) + norm * (prios.length - i));
    }
  });
  return [...pool].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || b.rating - a.rating);
}

function constraintPhrase(q: ParsedQuery): string {
  const parts: string[] = [];
  if (q.maxPrice !== undefined) parts.push(`under ${formatNPR(q.maxPrice)}`);
  if (q.minPrice !== undefined) parts.push(`above ${formatNPR(q.minPrice)}`);
  if (q.minRamGB !== undefined) parts.push(`${q.minRamGB} GB+ RAM`);
  if (q.minBatteryHours !== undefined) parts.push(`${q.minBatteryHours} h+ battery`);
  if (q.maxWeightGrams !== undefined) parts.push(`under ${formatWeight(q.maxWeightGrams)}`);
  if (q.tags?.includes("anc")) parts.push("noise cancelling");
  if (q.tags?.includes("camera")) parts.push("a strong camera");
  if (q.tags?.includes("gaming")) parts.push("gaming-ready");
  if (!parts.length) return "";
  const [first, ...rest] = parts;
  return first.startsWith("under") || first.startsWith("above") ? ` ${first}${rest.length ? ` with ${joinList(rest)}` : ""}` : ` with ${joinList(parts)}`;
}

function toSearchInput(q: ParsedQuery, extra: Partial<ToolInput<"search_products">> = {}): ToolInput<"search_products"> {
  return {
    category: q.category,
    minPrice: q.minPrice,
    maxPrice: q.maxPrice,
    minRamGB: q.minRamGB,
    minBatteryHours: q.minBatteryHours,
    maxWeightGrams: q.maxWeightGrams,
    tags: q.tags,
    brands: q.brands,
    sort: q.sort,
    limit: 12,
    ...extra,
  };
}

/** Relaxation ladder used when a search comes back empty ("adapt"). */
const RELAXATIONS: { label: (q: ParsedQuery) => string; apply: (q: ParsedQuery) => ParsedQuery | null }[] = [
  {
    label: (q) => `relaxed battery to ${Math.max(4, (q.minBatteryHours ?? 0) - 3)} h`,
    apply: (q) => (q.minBatteryHours ? { ...q, minBatteryHours: Math.max(4, q.minBatteryHours - 3) } : null),
  },
  { label: () => "dropped the weight limit", apply: (q) => (q.maxWeightGrams ? { ...q, maxWeightGrams: undefined } : null) },
  { label: () => "dropped the feature tags", apply: (q) => (q.tags?.length ? { ...q, tags: undefined } : null) },
  {
    label: (q) => `stretched the budget to ${formatNPR(Math.round(((q.maxPrice ?? 0) * 1.2) / 1000) * 1000)}`,
    apply: (q) => (q.maxPrice ? { ...q, maxPrice: Math.round((q.maxPrice * 1.2) / 1000) * 1000 } : null),
  },
];

const EXAMPLES = [
  "Coding laptop under 1.5 lakh with 16GB",
  "ANC headphones for noisy commutes",
  "Lightweight ultrabook for TU engineering",
];

export const mockAgent: Agent = {
  name: "mock",
  async run(req: AgentRequest, io: AgentIO) {
    const memory: AgentMemory = { ...req.memory, turn: req.memory.turn + 1 };
    const onCompare = req.context.path === "/compare" || req.context.compareIds.length >= 2;
    const intent = parseIntent(req.message, { hasPreviousQuery: !!memory.lastQuery, onCompare });
    const msg = io.message();
    const h = new Handlers(io, msg, memory, req);
    await h.handle(intent);
    io.remember(h.memory);
  },
};

class Handlers {
  constructor(
    private io: AgentIO,
    private msg: string,
    public memory: AgentMemory,
    private req: AgentRequest,
  ) {}

  async handle(intent: Intent): Promise<void> {
    switch (intent.kind) {
      case "greet":
        return this.greet();
      case "thanks":
        this.io.state("speaking");
        await this.io.say(this.msg, "Anytime! Shout if you want me to compare or find anything else.");
        return;
      case "help":
        return this.help();
      case "search":
        return this.search(intent.refinement && this.memory.lastQuery ? this.refine(this.memory.lastQuery, intent.query) : intent.query);
      case "compare":
        return this.compare(intent.ref);
      case "add_compare":
        return this.addCompare(intent.ref);
      case "remove_compare":
        return this.removeCompare(intent.ref);
      case "similar":
        return this.similar(intent.ref, intent.cheaper);
      case "add":
        return this.add(intent.ref, intent.qty);
      case "retry":
        return this.add({ kind: "pronoun" }, 1);
      case "remove":
        return this.remove(intent.ref);
      case "cart":
        return this.showCart();
      case "checkout":
        return this.checkout();
      case "delivery":
        return this.delivery(intent.city);
      case "question":
        return this.question(intent.ref, intent.topic);
      case "unknown":
        return this.unknown();
    }
  }

  /** The store grid (product cards) is on screen only on the landing page. */
  private onGrid(): boolean {
    return this.req.context.path === "/";
  }

  private chips(options: string[], question?: string) {
    this.io.block(this.msg, { kind: "clarify", id: `${this.msg}-chips`, options: options.slice(0, 4), question });
  }

  // ── Small talk ──

  private async greet() {
    this.io.state("greeting", "What hardware are we looking at?");
    await this.io.say(
      this.msg,
      "Tell me your workload, budget in lakhs, or what you're replacing. I search catalog specs, compare trade-offs, and check Valley delivery. You'll see every tool step I take.",
    );
    this.chips(EXAMPLES);
  }

  private async help() {
    this.io.state("speaking");
    await this.io.say(
      this.msg,
      "I can **search** the catalog from a plain description, **compare** products on real specs, check **stock** and **delivery**, and **add or remove** cart items, always double-checking the cart afterwards. I never check out for you; that's always your call.",
    );
    this.chips(EXAMPLES);
  }

  private async unknown() {
    this.io.state("speaking");
    await this.io.say(this.msg, "I'm not sure I got that. Try describing what you're shopping for, or ask me to compare or add something.");
    this.chips(this.memory.lastResultIds.length ? ["Compare the first two", "Show cheaper options", ...EXAMPLES.slice(0, 1)] : EXAMPLES);
  }

  // ── Search ──

  private refine(prev: ParsedQuery, next: ParsedQuery): ParsedQuery {
    const merged = mergeQuery(prev, next);
    if (/\b(cheaper|less expensive|lower price)\b/i.test(this.req.message)) {
      const shown = products(this.memory.lastResultIds);
      const floor = shown.length ? Math.min(...shown.map((p) => p.price)) : prev.maxPrice;
      if (floor) merged.maxPrice = floor - 1;
      merged.sort = "price-asc";
      merged.priorities = ["price", ...merged.priorities.filter((k) => k !== "price")];
    }
    if (/\blighter\b/i.test(this.req.message)) merged.priorities = ["weight", ...merged.priorities.filter((k) => k !== "weight")];
    if (/\b(raise|increase|stretch|bigger|higher)\b.*\bbudget\b/i.test(this.req.message) && prev.maxPrice) {
      merged.maxPrice = Math.round((prev.maxPrice * 1.25) / 1000) * 1000;
      if (/\bcheaper\b/i.test(this.req.message) === false) merged.sort = prev.sort;
    }
    return merged;
  }

  private async search(query: ParsedQuery) {
    const { io, msg } = this;
    if (!query.category && !query.tags?.length && !hasConstraints(query)) {
      io.state("speaking");
      await io.say(msg, "What hardware are we looking at? Tell me your budget or workload.");
      this.chips(["Laptops", "Phones", "Headphones", "Accessories"]);
      return;
    }

    io.state("thinking", "Thinking…");
    await io.pause(700);

    const pool = query.category ? getAllProducts().filter((p) => p.category === query.category).length : getAllProducts().length;
    const label = query.category ? CATEGORY_LABEL[query.category] : "products";
    io.state("searching", `Searching ${pool} ${label}…`);

    let q = query;
    let res = await this.searchWithRetry(q);
    if (!res) return;
    const relaxed: string[] = [];
    for (const step of RELAXATIONS) {
      if (res.products.length) break;
      const next = step.apply(q);
      if (!next) continue;
      relaxed.push(step.label(q));
      io.state("searching", "Widening the search…");
      q = next;
      res = await this.searchWithRetry(q);
      if (!res) return;
    }

    if (!res.products.length) {
      io.state("speaking");
      await io.say(msg, `I couldn't find any ${label}${constraintPhrase(query)}, even after loosening a few filters. Want to adjust the budget or requirements?`);
      this.chips(["Raise the budget", "Show all " + label]);
      this.memory.lastQuery = query;
      return;
    }

    const ranked = rank(res.products, q.priorities);
    const top = ranked.slice(0, 3);
    this.memory.lastResultIds = top.map((p) => p.id);
    this.memory.lastQuery = q;
    this.memory.lastComparedIds = [];
    this.memory.focusProductId = null;

    io.state("presenting", top.length === 1 ? "This one fits" : `These ${top.length} fit ${q.maxPrice ? "your budget" : "the bill"}`);
    io.ui({ type: "highlight", productIds: top.map((p) => p.id) });
    if (this.onGrid()) {
      io.ui({ type: "set_filters", category: q.category ?? null, maxPrice: q.maxPrice });
      io.ui({ type: "scroll_to", anchorId: `card:${top[0].id}` });
      io.ui({ type: "move_to", anchorId: `card:${top[0].id}`, size: "presenting" });
    }
    io.block(msg, { kind: "product_carousel", id: `${msg}-results`, productIds: top.map((p) => p.id), title: `${res.total} match${res.total === 1 ? "" : "es"}` });
    await io.pause(1100);

    io.state("speaking");
    await io.say(msg, this.describeResults(q, res.total, top, relaxed));
    const chips: string[] = [];
    if (top.filter((p) => p.stock > 0).length >= 2) chips.push("Compare the first two");
    const inStock = top.filter((p) => p.stock > 0);
    if (inStock.length >= 2 && inStock.some((p) => p.specs.weightGrams !== inStock[0].specs.weightGrams)) chips.push("Add the lighter one");
    chips.push("Show cheaper options");
    this.chips(chips);
  }

  private async searchWithRetry(q: ParsedQuery) {
    let r = await this.io.call(this.msg, "search_products", toSearchInput(q));
    if (!r.ok && r.error.code === "TRANSIENT") {
      this.io.state("thinking", "Retrying…");
      await this.io.pause(400);
      this.io.state("searching", "Searching again…");
      r = await this.io.call(this.msg, "search_products", toSearchInput(q));
    }
    if (!r.ok) {
      this.io.state("error", "Search failed");
      await this.io.say(this.msg, `The catalog didn't respond (${r.error.message}), so I can't show results right now. Try again in a moment?`);
      this.chips([this.req.message]);
      return null;
    }
    return r.output;
  }

  private describeResults(q: ParsedQuery, total: number, top: Product[], relaxed: string[]): string {
    const label = q.category ? CATEGORY_LABEL[q.category] : "products";
    const noun = total === 1 && q.category ? CATEGORY_LABEL[q.category].replace(/(es|s)$/, (m) => (q.category === "accessories" ? "y" : m === "es" ? "e" : "")) : label;
    const lead = relaxed.length
      ? `Nothing matched everything, so I ${joinList(relaxed)}. That gives ${total} ${noun}${constraintPhrase(q)}.`
      : `I found ${total} ${noun}${constraintPhrase(q)}.`;
    if (top.length === 1) {
      const p = top[0];
      return `${lead} **${name(p)}** fits: ${formatNPR(p.price)}${p.stock === 0 ? ", but it's out of stock right now" : ""}.`;
    }
    const cmp = compareProducts(top, { priorities: q.priorities.length ? q.priorities : undefined });
    const lines = top.map((p, i) => {
      const preds = cmp.predicates[p.id] ?? [];
      if (p.stock === 0) return `Heads-up: **${name(p)}** ${preds[0] ?? "is a strong option"}, but it's **out of stock** right now.`;
      if (i === 0) return `**${name(p)}** is my top pick: it ${joinList(preds.slice(0, 2)) || `costs ${formatNPR(p.price)}`}.`;
      return `**${name(p)}** ${preds[0] ?? `costs ${formatNPR(p.price)}`}.`;
    });
    return `${lead} Here are the top ${top.length}:\n\n${lines.join("\n")}`;
  }

  // ── Compare ──

  private async compare(ref: Ref | null) {
    const { io, msg, memory } = this;
    const pool = this.req.context.compareIds.length >= 2 && !memory.lastResultIds.length ? this.req.context.compareIds : memory.lastResultIds;
    let ids = ref ? resolveRef(ref, pool, { focusId: memory.focusProductId, pageProductId: this.req.context.pageProductId }) : pool.slice(0, 2);
    if (ref?.kind === "names" && ids.length === 1 && memory.focusProductId && memory.focusProductId !== ids[0]) ids = [memory.focusProductId, ids[0]];
    if (ref?.kind === "names" && ids.length === 1 && this.req.context.pageProductId && this.req.context.pageProductId !== ids[0]) ids = [this.req.context.pageProductId, ids[0]];
    ids = [...new Set(ids)].slice(0, 4);

    // "Compare it with similar ones": one product resolved → add its closest in-stock neighbours.
    if (ids.length === 1) {
      const base = product(ids[0]);
      if (base) {
        io.state("searching", "Finding similar…");
        const alts = await this.findSimilar(base, false);
        if (alts.length) ids = [base.id, ...alts.slice(0, 2).map((p) => p.id)];
      }
    }

    if (ids.length < 2) {
      io.state("speaking");
      await io.say(msg, pool.length ? "Which ones should I compare?" : "Tell me which products to compare. Names work, or ask me to find some first.");
      if (pool.length >= 2) this.chips(["Compare the first two", ...products(pool).map((p) => `Compare ${name(p)} with ${name(products(pool).find((x) => x.id !== p.id)!)}`).slice(0, 2)]);
      return;
    }

    const priorities = memory.lastQuery?.priorities.length ? memory.lastQuery.priorities : undefined;
    const context = needsLabel(memory.lastQuery);
    const caption = `Comparing ${joinList((priorities ?? ["battery", "weight"]).slice(0, 2).map((k) => KEY_LABEL[k]), "&")}…`;
    io.state("comparing", caption);
    if (this.onGrid()) io.ui({ type: "move_to", between: [`card:${ids[0]}`, `card:${ids[1]}`] });
    await io.pause(500);

    const r = await io.call(msg, "compare_products", { productIds: ids, priorities, context });
    if (!r.ok) {
      io.state("error", "Couldn't compare");
      await io.say(msg, `I couldn't run that comparison (${r.error.message}).`);
      return;
    }
    memory.lastComparedIds = ids;
    memory.focusProductId = null;
    io.ui({ type: "open_compare", productIds: ids, context, priorities });
    io.ui({ type: "move_to", anchorId: "compare-verdict" });
    io.block(msg, { kind: "comparison", id: `${msg}-cmp`, productIds: ids, verdict: r.output.verdict, winnerId: r.output.winnerId, context, priorities });
    await io.pause(900);

    io.state("speaking");
    await io.say(msg, r.output.verdict);
    const ps = products(ids);
    const chips: string[] = [];
    const winner = r.output.winnerId ? product(r.output.winnerId) : undefined;
    if (winner && winner.stock > 0) chips.push(`Add the ${name(winner)}`);
    const lightest = [...ps].sort((a, b) => a.specs.weightGrams - b.specs.weightGrams)[0];
    if (lightest && lightest.id !== winner?.id && lightest.stock > 0) chips.push("Add the lighter one");
    const cheapest = [...ps].sort((a, b) => a.price - b.price)[0];
    if (cheapest && cheapest.id !== winner?.id && cheapest.id !== lightest?.id && cheapest.stock > 0) chips.push("Add the cheaper one");
    if (chips.length) this.chips(chips);
  }

  private async addCompare(ref: Ref | null) {
    const { io, msg, memory } = this;
    const current = [...new Set(this.req.context.compareIds)];
    if (current.length >= 4) {
      io.state("speaking");
      await io.say(msg, "You can compare up to 4 products at once. Remove one first before adding another.");
      return;
    }

    const all = getAllProducts();
    const candidateIds = all.map((p) => p.id);
    const resolved = resolveRef(ref, candidateIds, {
      focusId: memory.focusProductId,
      pageProductId: this.req.context.pageProductId,
      suggestedId: memory.suggestedId,
    });

    if (resolved.length === 0) {
      io.state("speaking");
      await io.say(msg, "Which product would you like to add to the comparison?");
      return;
    }

    const targetId = resolved[0];
    const targetProduct = getProduct(targetId);
    if (!targetProduct) {
      io.state("error", "Product not found");
      await io.say(msg, "I couldn't find that product in the catalog.");
      return;
    }

    if (current.includes(targetId)) {
      io.state("speaking");
      await io.say(msg, `**${name(targetProduct)}** is already in your comparison.`);
      return;
    }

    const nextIds = [...current, targetId].slice(0, 4);
    memory.lastComparedIds = nextIds;
    memory.focusProductId = targetId;

    if (nextIds.length < 2) {
      io.ui({ type: "open_compare", productIds: nextIds });
      io.state("speaking");
      await io.say(msg, `Added **${name(targetProduct)}** to compare. Add another product to compare specs side by side.`);
      return;
    }

    io.state("comparing", `Comparing ${nextIds.length} products…`);
    await io.pause(400);

    const r = await io.call(msg, "compare_products", { productIds: nextIds });
    if (!r.ok) {
      io.state("error", "Couldn't compare");
      await io.say(msg, `I couldn't update the comparison (${r.error.message}).`);
      return;
    }

    io.ui({ type: "open_compare", productIds: nextIds });
    io.ui({ type: "move_to", anchorId: "compare-verdict" });
    io.block(msg, {
      kind: "comparison",
      id: `${msg}-cmp`,
      productIds: nextIds,
      verdict: r.output.verdict,
      winnerId: r.output.winnerId,
    });
    await io.pause(600);

    io.state("speaking");
    await io.say(msg, `Added **${name(targetProduct)}** to the comparison (${nextIds.length} products):\n\n${r.output.verdict}`);
  }

  private async removeCompare(ref: Ref | null) {
    const { io, msg, memory } = this;
    const current = [...new Set(this.req.context.compareIds)];
    if (current.length === 0) {
      io.state("speaking");
      await io.say(msg, "There are no products in your comparison to remove.");
      return;
    }

    const resolved = resolveRef(ref, current, {
      focusId: memory.focusProductId,
      pageProductId: this.req.context.pageProductId,
    });

    if (resolved.length === 0) {
      io.state("speaking");
      await io.say(msg, "Which product would you like to remove from the comparison?");
      this.chips(products(current).map((p) => `Remove ${name(p)} from compare`));
      return;
    }

    const targetId = resolved[0];
    const targetProduct = getProduct(targetId);
    const nextIds = current.filter((id) => id !== targetId);
    memory.lastComparedIds = nextIds;

    if (nextIds.length >= 2) {
      io.state("comparing", `Comparing ${nextIds.length} products…`);
      await io.pause(400);
      const r = await io.call(msg, "compare_products", { productIds: nextIds });
      io.ui({ type: "open_compare", productIds: nextIds });
      io.state("speaking");
      const v = r.ok ? r.output.verdict : "";
      await io.say(msg, `Removed **${targetProduct ? name(targetProduct) : targetId}** from the comparison.${v ? `\n\n${v}` : ""}`);
    } else if (nextIds.length === 1) {
      io.ui({ type: "open_compare", productIds: nextIds });
      io.state("speaking");
      await io.say(msg, `Removed **${targetProduct ? name(targetProduct) : targetId}**. You now have 1 product selected; pick another to compare specs.`);
    } else {
      io.ui({ type: "navigate", to: "/" });
      io.state("speaking");
      await io.say(msg, `Removed **${targetProduct ? name(targetProduct) : targetId}**. Your comparison is now empty.`);
    }
  }

  // ── Similar / alternatives ──

  /** Closest in-stock products in the same category (by RAM, battery, weight and price distance). */
  private async findSimilar(p: Product, cheaper: boolean): Promise<Product[]> {
    // Stay within the user's stated budget when the original product fit it.
    const budget = this.memory.lastQuery?.maxPrice;
    const ceiling = budget !== undefined && p.price <= budget ? budget : Infinity;
    const r = await this.io.call(this.msg, "search_products", {
      category: p.category,
      maxPrice: Math.min(ceiling, cheaper ? p.price - 1 : Math.round(p.price * 1.25)),
      minPrice: cheaper ? undefined : Math.round(p.price * 0.6),
      limit: 12,
    });
    if (!r.ok) return [];
    const dist = (x: Product) =>
      (
        [
          [x.specs.ramGB, p.specs.ramGB],
          [x.specs.batteryHours, p.specs.batteryHours],
          [x.specs.weightGrams, p.specs.weightGrams],
          [x.price, p.price],
        ] as [number | undefined, number | undefined][]
      ).reduce((sum, [a, b]) => sum + (a !== undefined && b ? Math.abs(a - b) / b : 0.5), 0);
    const exclude = new Set([p.id, ...this.req.context.cartProductIds]);
    return r.output.products.filter((x) => !exclude.has(x.id) && x.stock > 0).sort((a, b) => dist(a) - dist(b));
  }

  private async similar(ref: Ref | null, cheaper: boolean) {
    const { io, msg, memory } = this;
    const pool = this.candidatePool();
    const ids = resolveRef(ref ?? { kind: "pronoun" }, pool, {
      focusId: memory.focusProductId,
      pageProductId: this.req.context.pageProductId,
      suggestedId: memory.suggestedId,
    });
    const base = ids.length === 1 ? product(ids[0]) : undefined;
    if (!base) {
      io.state("speaking");
      await io.say(msg, "Similar to which product?");
      if (pool.length) this.chips(products(pool).map((p) => `Find something similar to the ${name(p)}`));
      return;
    }
    io.state("thinking", "Thinking…");
    await io.pause(500);
    io.state("searching", cheaper ? "Finding cheaper options…" : "Finding similar…");
    const alts = (await this.findSimilar(base, cheaper)).slice(0, 3);
    if (!alts.length) {
      io.state("speaking");
      await io.say(msg, `I couldn't find ${cheaper ? "a cheaper" : "a similar"} in-stock alternative to the **${name(base)}**.`);
      return;
    }
    memory.lastResultIds = alts.map((p) => p.id);
    memory.lastComparedIds = [];
    memory.suggestedId = alts[0].id;
    io.state("presenting", `${alts.length} alternative${alts.length === 1 ? "" : "s"}`);
    io.ui({ type: "highlight", productIds: alts.map((p) => p.id) });
    if (this.onGrid()) {
      io.ui({ type: "set_filters", category: base.category, maxPrice: undefined });
      io.ui({ type: "scroll_to", anchorId: `card:${alts[0].id}` });
      io.ui({ type: "move_to", anchorId: `card:${alts[0].id}`, size: "presenting" });
    }
    io.block(msg, { kind: "product_carousel", id: `${msg}-similar`, productIds: alts.map((p) => p.id), title: cheaper ? "Cheaper picks" : "Similar picks" });
    await io.pause(900);
    io.state("speaking");
    const lines = alts.map((a) => {
      const pred = compareProducts([a, base]).predicates[a.id]?.[0];
      return `**${name(a)}** (${formatNPR(a.price)})${pred ? ` ${pred}` : ""}.`;
    });
    await io.say(msg, `Here ${alts.length === 1 ? "is an" : `are ${alts.length}`} in-stock alternative${alts.length === 1 ? "" : "s"} to the **${name(base)}**${cheaper ? " that cost less" : ""}:\n\n${lines.join("\n")}`);
    this.chips([`Compare the ${name(alts[0])} and ${name(base)}`, `Add the ${name(alts[0])}`]);
  }

  // ── Cart actions ──

  /**
   * What "the first / the lighter one / it" refers to. Ordinals point at the results list as
   * shown in the carousel; comparative words point at the items just compared.
   */
  private candidatePool(ref?: Ref | null): string[] {
    const { memory } = this;
    const positional = ref && (ref.kind === "ordinal" || ref.kind === "first_n" || ref.kind === "all");
    if (positional && memory.lastResultIds.length) return memory.lastResultIds;
    if (memory.lastComparedIds.length) return memory.lastComparedIds;
    if (memory.lastResultIds.length) return memory.lastResultIds;
    return this.req.context.compareIds;
  }

  private async add(ref: Ref | null, qty: number) {
    const { io, msg, memory } = this;
    const pool = this.candidatePool(ref);
    const winnerId = memory.lastComparedIds.length >= 2 ? compareProducts(products(memory.lastComparedIds), { priorities: memory.lastQuery?.priorities }).winnerId : null;
    let ids = resolveRef(ref ?? { kind: "pronoun" }, pool, {
      focusId: memory.focusProductId,
      suggestedId: memory.suggestedId,
      winnerId,
      pageProductId: this.req.context.pageProductId,
    });
    if (!ids.length && !ref && this.req.context.pageProductId) ids = [this.req.context.pageProductId];

    if (ids.length !== 1) {
      io.state("speaking");
      if (ids.length > 1) {
        await io.say(msg, "Which one should I add?");
        this.chips(products(ids).map((p) => `Add the ${name(p)}`));
      } else if (pool.length) {
        await io.say(msg, "Which one should I add?");
        this.chips(products(pool).map((p) => `Add the ${name(p)}`));
      } else {
        await io.say(msg, "What should I add? Tell me the product, or ask me to find something first.");
      }
      return;
    }

    const p = product(ids[0]);
    if (!p) return;
    memory.focusProductId = p.id;
    const blockId = `${msg}-cart`;
    io.state("acting", `Adding ${name(p)} to cart…`);
    const productAnchor = this.onGrid() ? `card:${p.id}` : this.req.context.pageProductId === p.id ? "add-to-cart" : null;
    if (productAnchor) io.ui({ type: "move_to", anchorId: productAnchor });
    io.block(msg, { kind: "cart_action", id: blockId, action: "add", productId: p.id, status: "pending" });

    // Observe before acting: live stock.
    const stock = await io.call(msg, "check_stock", { productId: p.id });
    if (stock.ok && !stock.output.inStock) return this.outOfStock(p, blockId);

    let r = await io.call(msg, "add_to_cart", { productId: p.id, qty });
    if (!r.ok && r.error.code === "TRANSIENT") {
      io.state("acting", "Store hiccuped, retrying…");
      await io.pause(400);
      r = await io.call(msg, "add_to_cart", { productId: p.id, qty });
    }
    if (!r.ok) {
      if (r.error.code === "OUT_OF_STOCK") return this.outOfStock(p, blockId);
      io.state("error", "Couldn't add that");
      io.block(msg, { kind: "cart_action", id: blockId, action: "add", productId: p.id, status: "failed", message: r.error.message });
      await io.say(msg, `I couldn't add the **${name(p)}**: ${r.error.message} Nothing changed in your cart.`);
      this.chips(["Try again"]);
      return;
    }
    if (!r.verification?.verified) {
      io.state("error", "Couldn't verify");
      io.block(msg, { kind: "cart_action", id: blockId, action: "add", productId: p.id, status: "failed", line: r.verification?.line ?? null, message: "The store accepted it, but the item isn't in your cart." });
      await io.say(msg, `The store said the **${name(p)}** was added, but when I checked your cart it isn't there, so I won't call that done. Want me to try again?`);
      this.chips(["Try again", "Show my cart"]);
      return;
    }

    const line = r.verification.line!;
    // Pip rides along with the item to the cart icon, and celebrates there.
    io.ui({ type: "cart_updated", flyProductId: p.id });
    io.state("success", "Added & verified ✓");
    io.block(msg, { kind: "cart_action", id: blockId, action: "add", productId: p.id, status: "verified", line });
    await io.pause(600);
    await io.say(
      msg,
      `Done: the **${name(p)}** is in your cart (${line.qty} × ${formatNPR(line.unitPrice)}). I re-checked the cart to confirm. Checkout is up to you, whenever you're ready.`,
    );
    this.chips(["Show my cart", "Go to checkout", "Check delivery"]);
  }

  private async outOfStock(p: Product, blockId: string) {
    const { io, msg, memory } = this;
    io.state("error", "Out of stock");
    io.block(msg, { kind: "cart_action", id: blockId, action: "add", productId: p.id, status: "failed", message: `${name(p)} is out of stock.` });

    // Adapt: find the closest in-stock alternative.
    io.state("searching", "Looking for an alternative…");
    const best = (await this.findSimilar(p, false))[0];
    io.state("error", "Out of stock");

    if (!best) {
      await io.say(msg, `I couldn't add the **${name(p)}**: it's out of stock right now, so nothing was added. I couldn't find a close in-stock alternative either.`);
      return;
    }
    memory.suggestedId = best.id;
    if (this.onGrid()) io.ui({ type: "move_to", anchorId: `card:${best.id}` });
    const cmp = compareProducts([best, p]);
    const why = cmp.predicates[best.id]?.slice(0, 2) ?? [];
    io.block(msg, { kind: "product_carousel", id: `${msg}-alt`, productIds: [best.id], title: "Closest in stock" });
    await io.say(
      msg,
      `I couldn't add the **${name(p)}**: it's out of stock right now, so nothing was added. The closest in-stock option is the **${name(best)}** (${formatNPR(best.price)})${why.length ? `, which ${joinList(why)}` : ""}. Want me to add that instead?`,
    );
    this.chips([`Add the ${name(best)} instead`, `Compare ${name(best)} and ${name(p)}`]);
  }

  private async remove(ref: Ref | null) {
    const { io, msg, memory } = this;
    io.state("thinking", "Checking your cart…");
    const cart = await io.call(msg, "get_cart", {});
    if (!cart.ok) {
      io.state("error", "Cart unavailable");
      await io.say(msg, "I couldn't read your cart just now. Try again in a moment?");
      return;
    }
    const inCart = cart.output.lines.map((l) => l.productId);
    if (!inCart.length) {
      io.state("speaking");
      await io.say(msg, "Your cart is already empty.");
      return;
    }
    const ids = resolveRef(ref ?? { kind: "pronoun" }, inCart, { focusId: memory.focusProductId && inCart.includes(memory.focusProductId) ? memory.focusProductId : null }).filter((id) => inCart.includes(id));
    if (ids.length !== 1) {
      io.state("speaking");
      await io.say(msg, "Which item should I remove?");
      this.chips(products(inCart).map((p) => `Remove the ${name(p)}`));
      return;
    }
    const p = product(ids[0])!;
    const blockId = `${msg}-cart`;
    io.state("acting", `Removing ${name(p)}…`);
    io.block(msg, { kind: "cart_action", id: blockId, action: "remove", productId: p.id, status: "pending" });
    const r = await io.call(msg, "remove_from_cart", { productId: p.id });
    if (!r.ok || !r.verification?.verified) {
      io.state("error", "Couldn't remove that");
      io.block(msg, { kind: "cart_action", id: blockId, action: "remove", productId: p.id, status: "failed", line: r.ok ? r.verification?.line ?? null : null, message: r.ok ? "Still in your cart after the update." : r.error.message });
      await io.say(msg, `I couldn't remove the **${name(p)}**${r.ok ? ": the store accepted it, but it's still in your cart" : `: ${r.error.message}`}. Want me to try again?`);
      this.chips([`Remove the ${name(p)}`]);
      return;
    }
    memory.focusProductId = null;
    io.state("success", "Removed & verified ✓");
    io.block(msg, { kind: "cart_action", id: blockId, action: "remove", productId: p.id, status: "verified", line: null });
    io.ui({ type: "cart_updated" });
    await io.say(msg, `Removed the **${name(p)}**. I re-checked the cart and it's gone. Want a cheaper alternative?`);
    this.chips([`Find a cheaper alternative to the ${name(p)}`]);
  }

  private async showCart() {
    const { io, msg } = this;
    io.state("thinking", "Checking your cart…");
    const cart = await io.call(msg, "get_cart", {});
    if (!cart.ok) {
      io.state("error", "Cart unavailable");
      await io.say(msg, "I couldn't read your cart just now. Try again in a moment?");
      return;
    }
    io.state("speaking");
    io.ui({ type: "move_to", anchorId: "cart-button" });
    io.ui({ type: "open_drawer", name: "cart" });
    if (!cart.output.lines.length) {
      await io.say(msg, "Your cart is empty. Want me to find something?");
      this.chips(EXAMPLES);
      return;
    }
    const lines = cart.output.lines.map((l) => `• ${l.qty} × **${l.name}**: ${formatNPR(l.lineTotal)}`).join("\n");
    await io.say(msg, `Here's your cart:\n\n${lines}\n\nSubtotal **${formatNPR(cart.output.subtotal)}**.`);
    this.chips(["Go to checkout"]);
  }

  private async checkout() {
    const { io, msg } = this;
    io.state("thinking", "Checking your cart…");
    const cart = await io.call(msg, "get_cart", {});
    io.state("speaking");
    if (cart.ok && cart.output.lines.length === 0) {
      await io.say(msg, "Your cart is empty, so there's nothing to check out yet.");
      return;
    }
    io.ui({ type: "navigate", to: "/checkout" });
    await io.say(msg, "I can't place orders or pay for you. That's always your decision. I've opened checkout so you can review everything and confirm yourself.");
  }

  private async delivery(city: string | null) {
    const { io, msg } = this;
    io.state("thinking", "Checking delivery…");
    const r = await io.call(msg, "get_delivery_info", { city: city ?? "Kathmandu" });
    io.state("speaking");
    if (!r.ok) {
      await io.say(msg, "I couldn't fetch delivery details right now.");
      return;
    }
    const d = r.output;
    await io.say(
      msg,
      `Delivery to **${d.city}** takes ${d.days}. The fee is ${formatNPR(d.fee)}, free on orders over ${formatNPR(d.freeOver)}.${city ? "" : " (Tell me your destination city if you'd like to check elsewhere.)"}`,
    );
  }

  // ── Product questions ──

  private async question(ref: Ref | null, topic: Topic) {
    const { io, msg, memory } = this;
    const pool = memory.lastComparedIds.length ? memory.lastComparedIds : memory.lastResultIds;
    const ids = resolveRef(ref, pool, { focusId: memory.focusProductId, pageProductId: this.req.context.pageProductId, suggestedId: memory.suggestedId });
    if (ids.length !== 1) {
      io.state("speaking");
      await io.say(msg, "Which product do you mean?");
      if (pool.length) this.chips(products(pool).map((p) => `Tell me about the ${name(p)}`));
      return;
    }
    io.state("thinking", "Looking it up…");
    const r = await io.call(msg, "get_product", { productId: ids[0] });
    if (!r.ok) {
      io.state("error", "Lookup failed");
      await io.say(msg, `I couldn't look that up (${r.error.message}).`);
      return;
    }
    const p = r.output;
    memory.focusProductId = p.id;
    if (this.req.context.pageProductId === p.id) {
      const anchorId = TOPIC_ANCHOR[topic];
      io.ui({ type: "move_to", anchorId });
      io.ui({ type: "highlight", anchorId });
    }
    io.state("speaking");
    await io.say(msg, answer(p, topic));
    this.chips(p.stock > 0 ? [`Add the ${name(p)}`, "Compare it with similar ones"] : ["Find something similar in stock"]);
  }
}

/** Product-page anchor that shows the fact a question is about. */
const TOPIC_ANCHOR: Record<Topic, string> = {
  battery: "spec:battery",
  weight: "spec:weight",
  ram: "spec:ram",
  gaming: "spec:gpu",
  warranty: "spec:warranty",
  price: "price",
  stock: "stock",
  screen: "spec:screen",
  storage: "spec:storage",
  general: "gallery",
};

function answer(p: Product, topic: Topic): string {
  const s = p.specs;
  const n = `The **${p.name}**`;
  switch (topic) {
    case "battery":
      if (!s.batteryHours) return `${n} doesn't list a battery rating.`;
      return `${n} is rated for about **${s.batteryHours} h**${p.category === "headphones" ? " of playback" : " of typical use"}. ${
        p.category === "laptops" ? (s.batteryHours >= 10 ? "That's a full workday for most people." : s.batteryHours < 7 ? "Keep a charger nearby." : "Decent, but not quite all-day.") : ""
      }`.trim();
    case "weight":
      return `${n} weighs **${formatWeight(s.weightGrams)}**. ${
        p.category === "laptops" ? (s.weightGrams <= 1400 ? "Very easy to carry around." : s.weightGrams >= 2000 ? "That's on the heavy side for daily carry." : "Fine for a daily commute.") : ""
      }`.trim();
    case "ram":
      if (!s.ramGB) return `${n} doesn't have a RAM spec listed.`;
      return `${n} has **${s.ramGB} GB RAM**. ${
        s.ramGB >= 24 ? "Plenty for Docker with several containers plus an IDE." : s.ramGB >= 16 ? "Comfortable for Docker and a typical full-stack setup." : "That's tight for Docker; I'd look for 16 GB."
      }`;
    case "gaming":
      if (!s.gpu) return `${n} isn't really a gaming device.`;
      return /rtx|gtx|radeon rx/i.test(s.gpu)
        ? `Yes: ${p.name} has a dedicated **${s.gpu}**, which handles modern games well at 1080p.`
        : `Only light gaming: ${p.name} uses integrated graphics (**${s.gpu}**). Older or esports titles will run, but not demanding AAA games.`;
    case "warranty":
      return `${n} comes with a **${formatWarranty(s.warrantyMonths)}** warranty.`;
    case "price":
      return `${n} costs **${formatNPR(p.price)}**.`;
    case "stock":
      return `${n}: **${stockLabel(p.stock)}**.`;
    case "screen":
      return s.screen ? `${n} has a **${s.screen}** display.` : `${n} doesn't have a display.`;
    case "storage":
      return s.storageGB ? `${n} has **${formatStorage(s.storageGB)}** of storage.` : `${n} doesn't list storage.`;
    case "general": {
      const facts = [
        s.cpu && `${s.cpu}`,
        s.ramGB && `${s.ramGB} GB RAM`,
        s.storageGB && formatStorage(s.storageGB),
        s.batteryHours && `${s.batteryHours} h battery`,
        formatWeight(s.weightGrams),
      ].filter(Boolean);
      return `${n}: ${p.blurb} Key specs: ${facts.join(", ")}. ${formatNPR(p.price)}, ${stockLabel(p.stock).toLowerCase()}.`;
    }
  }
}
