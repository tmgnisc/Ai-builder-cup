import { DELIVERY_RULES } from "@/lib/commerce/delivery";
import { formatNPR, formatStorage, formatWarranty, formatWeight } from "@/lib/commerce/format";
import type { Category, Product } from "@/lib/commerce/schemas";
import {
  brandStats,
  cheaperThanPct,
  coreThreads,
  countByCategory,
  countWhere,
  isDedicatedGpu,
  lighterThanPct,
  longerBatteryThanPct,
  maxWarrantyMonths,
  moreRamThanPct,
  priceSpread,
} from "./stats";

/**
 * Pip's guide content: a typed registry of tips keyed by anchor topic and escalation level.
 *   level 1: a tiny one-line tip (Pip flies beside the element)
 *   level 2: a helpful question with chips
 * Tips are computed from catalog data; a builder returns null when it has nothing true and
 * useful to say (e.g. not enough data), and the engine stays quiet.
 */

export type PageType = "home" | "category" | "product" | "cart" | "checkout" | "merchant" | "other";

export interface TipChip {
  label: string;
  /** Sent to Pip as a user message. Without one, the chip just closes the bubble. */
  message?: string;
  /** "feedback": asks the shopper what's in their way (recorded for the store team). */
  action?: "feedback";
}

export interface Tip {
  /** Unique per subject; a tip id is never shown twice in a session. */
  id: string;
  text: string;
  chips?: TipChip[];
  productIds?: string[];
}

export interface TipCtx {
  page: PageType;
  anchor: { id: string; topic: string; productId: string | null } | null;
  product: Product | null;
  category: Category | null;
  cart: { count: number; subtotal: number };
  /** Tips already said this session (set by the engine), so intros don't repeat a fact. */
  seenTipIds?: string[];
}

type Builder = (ctx: TipCtx) => Tip | null;

const CAT_NOUN: Record<Category, string> = { laptops: "laptops", phones: "phones", headphones: "headphones", accessories: "accessories", clothing: "clothes" };
const NOT_NOW: TipChip = { label: "Not now" };
const pct = (n: number | null, min = 55) => n !== null && n >= min;
const id = (topic: string, level: number, ctx: TipCtx) => `${topic}:${level}:${ctx.product?.id ?? ctx.category ?? ""}`;

/** The single most notable fact about a product, from catalog data. */
export function standoutFact(p: Product): string {
  const noun = CAT_NOUN[p.category];
  if (p.stock === 0) return `It's out of stock right now. I can find the closest in-stock option.`;
  const light = lighterThanPct(p);
  const battery = longerBatteryThanPct(p);
  const cheap = cheaperThanPct(p);
  const facts: [number, string][] = [];
  const one = noun.replace(/s$/, "");
  if (pct(light)) facts.push([light!, light === 100 ? `At ${formatWeight(p.specs.weightGrams)}, it's the lightest ${one} here.` : `At ${formatWeight(p.specs.weightGrams)}, it's lighter than ${light}% of the ${noun} here.`]);
  if (pct(battery) && p.specs.batteryHours)
    facts.push([battery!, battery === 100 ? `${p.specs.batteryHours} h of battery: the longest of any ${one} here.` : `${p.specs.batteryHours} h of battery beats ${battery}% of the ${noun} here.`]);
  if (pct(cheap)) facts.push([cheap!, cheap === 100 ? `At ${formatNPR(p.price)}, it's the most affordable ${one} here.` : `At ${formatNPR(p.price)}, it's cheaper than ${cheap}% of the ${noun} here.`]);
  if (facts.length) return facts.sort((a, b) => b[0] - a[0])[0][1];
  if (p.stock <= 3) return `Only ${p.stock} left in stock.`;
  return `${p.blurb}`;
}

const specLevel2 = (topic: string): Builder => (ctx) =>
  ctx.product
    ? {
        id: id(topic, 2, ctx),
        text: `Want me to compare the ${ctx.product.name} with similar ${CAT_NOUN[ctx.product.category]} on this?`,
        chips: [{ label: "Compare with similar", message: `Compare the ${ctx.product.name} with similar ones` }, NOT_NOW],
      }
    : null;

export const TIPS: Record<string, { 1?: Builder; 2?: Builder }> = {
  hero: {
    1: (ctx) => ({ id: id("hero", 1, ctx), text: "That's me! Click me any time, press **/** to type, or hold **V** to talk." }),
  },
  "hero-prompt": {
    1: (ctx) => ({ id: id("hero-prompt", 1, ctx), text: "Describe it in your own words. Budgets like “1.2 lakh” or “under 90k” work." }),
    2: (ctx) => ({
      id: id("hero-prompt", 2, ctx),
      text: "Not sure how to phrase it? Pick one and I'll take it from there.",
      chips: [
        { label: "Laptop for coding", message: "A laptop under 1.2 lakh for coding" },
        { label: "Headphones for flights", message: "Noise-cancelling headphones for flights" },
        NOT_NOW,
      ],
    }),
  },
  "category-pills": {
    1: (ctx) => {
      const c = countByCategory();
      return { id: id("category-pills", 1, ctx), text: `${c.laptops} laptops, ${c.phones} phones, ${c.headphones} headphones, ${c.accessories} accessories and ${c.clothing} clothing items in the store.` };
    },
    2: (ctx) => ({
      id: id("category-pills", 2, ctx),
      text: "Tell me what it's for and I'll narrow it down for you.",
      chips: [{ label: "Laptops for coding", message: "A laptop for coding with good battery" }, { label: "Travel headphones", message: "Noise-cancelling headphones for flights" }, NOT_NOW],
    }),
  },
  "filter-price": {
    1: (ctx) => {
      const s = priceSpread(ctx.category);
      const noun = ctx.category ? CAT_NOUN[ctx.category] : "products";
      return { id: id("filter-price", 1, ctx), text: `Most ${noun} here cost between ${formatNPR(s.q1)} and ${formatNPR(s.q3)}; the median is ${formatNPR(s.median)}.` };
    },
    2: (ctx) => {
      const cat = ctx.category ?? "laptops";
      return {
        id: id("filter-price", 2, ctx),
        text: "Should I prioritise price, performance, or battery?",
        chips: [
          { label: "Price", message: `Show me the best value ${cat}` },
          { label: "Performance", message: `Show the top rated ${cat}` },
          { label: "Battery", message: `${cat} with the best battery life` },
        ],
      };
    },
  },
  "filter-ram": {
    1: (ctx) => {
      const n = countWhere("laptops", (p) => (p.specs.ramGB ?? 0) >= 16);
      return { id: id("filter-ram", 1, ctx), text: `16 GB is the sweet spot for Docker and big projects. ${n} of our laptops have 16 GB or more.` };
    },
  },
  "filter-battery": {
    1: (ctx) => {
      const n = countWhere("laptops", (p) => (p.specs.batteryHours ?? 0) >= 10);
      return { id: id("filter-battery", 1, ctx), text: `${n} laptops here are rated for 10 h or more: a full workday away from a socket.` };
    },
  },
  "filter-brand": {
    1: (ctx) => {
      const b = brandStats(ctx.category);
      return { id: id("filter-brand", 1, ctx), text: `${b.brands} brands here. ${b.topBrand} has the most options (${b.topCount}).` };
    },
  },
  "product-card": {
    1: (ctx) => (ctx.product ? { id: id("product-card", 1, ctx), text: `**${ctx.product.name}**\n${standoutFact(ctx.product)}` } : null),
    2: (ctx) =>
      ctx.product
        ? {
            id: id("product-card", 2, ctx),
            text: `Want me to compare the ${ctx.product.name} with similar ${CAT_NOUN[ctx.product.category]}?`,
            chips: [
              { label: "Compare with similar", message: `Compare the ${ctx.product.name} with similar ones` },
              { label: "Tell me more", message: `Tell me about the ${ctx.product.name}` },
              NOT_NOW,
            ],
          }
        : null,
  },
  gallery: {
    1: (ctx) => (ctx.product ? { id: id("gallery", 1, ctx), text: `Flip between front, angle and detail views below. ${standoutFact(ctx.product)}` } : null),
  },
  price: {
    1: (ctx) => {
      const p = ctx.product;
      if (!p) return null;
      const c = cheaperThanPct(p);
      return c === null ? null : { id: id("price", 1, ctx), text: `${formatNPR(p.price)} is cheaper than ${c}% of the ${CAT_NOUN[p.category]} here.` };
    },
  },
  "stock-badge": {
    1: (ctx) => {
      const p = ctx.product;
      if (!p) return null;
      if (p.stock === 0) return { id: id("stock-badge", 1, ctx), text: "Out of stock right now. I can find the closest in-stock alternative.", chips: [{ label: "Find similar in stock", message: `Find something similar to the ${p.name}` }, NOT_NOW] };
      return { id: id("stock-badge", 1, ctx), text: p.stock <= 3 ? `Only ${p.stock} left, so don't wait too long.` : `In stock (${p.stock} units), ready to ship.` };
    },
  },
  "add-to-cart": {
    1: (ctx) => ({ id: id("add-to-cart", 1, ctx), text: "When I add things for you, I re-check the cart, so “added” always means added." }),
  },
  "compare-toggle": {
    1: (ctx) => ({ id: id("compare-toggle", 1, ctx), text: "Pick 2–3 products and I'll lay out the trade-offs side by side, with real specs only." }),
  },
  delivery: {
    1: (ctx) => {
      const v = DELIVERY_RULES.valley;
      const qualifies = ctx.product && ctx.product.price >= v.freeOver;
      return { id: id("delivery", 1, ctx), text: `Express delivery takes ${v.days}${qualifies ? ", and this item ships free" : `, free over ${formatNPR(v.freeOver)}`}.` };
    },
    2: (ctx) => ({ id: id("delivery", 2, ctx), text: "Want to check shipping to your destination? Tell me your city and I'll verify.", chips: [{ label: "Check delivery", message: "Check delivery time" }, NOT_NOW] }),
  },
  "spec-table": {
    1: (ctx) => (ctx.product ? { id: id("spec-table", 1, ctx), text: "Every number here comes straight from the catalog. Hover a row and I'll put it in context." } : null),
  },
  "spec-cpu": {
    1: (ctx) => {
      const ct = coreThreads(ctx.product?.specs.cpu);
      return ct ? { id: id("spec-cpu", 1, ctx), text: `${ct.cores} cores and ${ct.threads} threads: plenty for compiling, containers and multitasking.` } : null;
    },
    2: specLevel2("spec-cpu"),
  },
  "spec-ram": {
    1: (ctx) => {
      const p = ctx.product;
      const ram = p?.specs.ramGB;
      if (!p || !ram) return null;
      const more = moreRamThanPct(p);
      const verdict = ram >= 24 ? "Plenty for Docker with several containers." : ram >= 16 ? "Comfortable for Docker and full-stack work." : "Tight for Docker; I'd aim for 16 GB.";
      return { id: id("spec-ram", 1, ctx), text: `${ram} GB RAM. ${verdict}${more !== null && more >= 50 ? ` More than ${more}% of the ${CAT_NOUN[p.category]} here.` : ""}` };
    },
    2: specLevel2("spec-ram"),
  },
  "spec-battery": {
    1: (ctx) => {
      const p = ctx.product;
      const h = p?.specs.batteryHours;
      if (!p || !h) return null;
      const better = longerBatteryThanPct(p);
      const verdict = p.category === "laptops" ? (h >= 10 ? "That's a full workday, great for travel." : h < 7 ? "Keep a charger nearby." : "Decent, not quite all-day.") : "";
      return { id: id("spec-battery", 1, ctx), text: `${h} h${better !== null ? `, longer than ${better}% of the ${CAT_NOUN[p.category]} here` : ""}. ${verdict}`.trim() };
    },
    2: specLevel2("spec-battery"),
  },
  "spec-weight": {
    1: (ctx) => {
      const p = ctx.product;
      if (!p) return null;
      const light = lighterThanPct(p);
      return { id: id("spec-weight", 1, ctx), text: `${formatWeight(p.specs.weightGrams)}${light !== null ? `: lighter than ${light}% of the ${CAT_NOUN[p.category]} here` : ""}.` };
    },
    2: specLevel2("spec-weight"),
  },
  "spec-gpu": {
    1: (ctx) => {
      const gpu = ctx.product?.specs.gpu;
      if (!gpu) return null;
      return {
        id: id("spec-gpu", 1, ctx),
        text: isDedicatedGpu(gpu) ? `${gpu}: a dedicated GPU, good for 1080p gaming and GPU work.` : `Integrated graphics: fine for coding and video, light gaming only.`,
      };
    },
  },
  "spec-storage": {
    1: (ctx) => {
      const gb = ctx.product?.specs.storageGB;
      return gb ? { id: id("spec-storage", 1, ctx), text: `${formatStorage(gb)}${gb >= 1000 ? ": room for big projects, images and media." : ". Add a portable SSD if you work with large files."}` } : null;
    },
  },
  "spec-warranty": {
    1: (ctx) => {
      const p = ctx.product;
      if (!p) return null;
      const max = maxWarrantyMonths(p.category);
      return { id: id("spec-warranty", 1, ctx), text: `${formatWarranty(p.specs.warrantyMonths)} warranty${p.specs.warrantyMonths >= max ? ", the longest in this category" : `; the longest here is ${formatWarranty(max)}`}.` };
    },
  },
  cart: {
    1: (ctx) => ({
      id: `cart:1:${ctx.cart.count}`,
      text: ctx.cart.count ? `${ctx.cart.count} item${ctx.cart.count === 1 ? "" : "s"} in your cart, ${formatNPR(ctx.cart.subtotal)} so far.` : "Your cart is empty. Ask me to find something and I'll add it for you.",
    }),
  },
  "cart-drawer": {
    1: (ctx) => ({
      id: id("cart-drawer", 1, ctx),
      text: `Subtotal ${formatNPR(ctx.cart.subtotal)}. Express delivery is free over ${formatNPR(DELIVERY_RULES.valley.freeOver)}.`,
    }),
  },
  "checkout-button": {
    1: (ctx) => ({ id: id("checkout-button", 1, ctx), text: "Checkout is always yours to confirm. I never pay or place orders." }),
  },
  checkout: {
    1: (ctx) => ({ id: id("checkout", 1, ctx), text: "Review everything here. Placing the order is your call; I can't do it for you." }),
    2: (ctx) => ({ id: id("checkout", 2, ctx), text: "Want me to check delivery estimates for your order?", chips: [{ label: "Check delivery", message: "Check delivery estimates" }, NOT_NOW] }),
  },
  "compare-verdict": {
    1: (ctx) => ({ id: id("compare-verdict", 1, ctx), text: "Every value in this table is from the catalog; the lime cells are the winners." }),
  },
};

/** Page intros: said once per page type per session, on arrival. */
export const INTROS: Partial<Record<PageType, Builder>> = {
  home: () => ({ id: "intro:home", text: "Hi! I'm **Pip**. Tell me what you need, or just browse. I'll point out what matters as you go." }),
  category: (ctx) => {
    if (!ctx.category) return null;
    const s = priceSpread(ctx.category);
    return { id: `intro:category:${ctx.category}`, text: `${countByCategory()[ctx.category]} ${CAT_NOUN[ctx.category]} from ${formatNPR(s.min)}. Tell me your budget and what it's for, and I'll narrow it down.` };
  },
  product: (ctx) => {
    const p = ctx.product;
    if (!p) return null;
    const saidFact = ctx.seenTipIds?.some((t) => t.startsWith("product-card:1:" + p.id));
    return { id: `intro:product`, text: `The **${p.name}**.${saidFact ? "" : ` ${standoutFact(p)}`} Ask me anything about it, or rest on a spec and I'll put it in context.` };
  },
  checkout: () => ({ id: "intro:checkout", text: "Almost there. Review your order and confirm when you're ready. I never place orders myself." }),
  cart: (ctx) => ({ id: "intro:cart", text: ctx.cart.count ? `Here's your cart: ${formatNPR(ctx.cart.subtotal)} so far. Say “remove …” and I'll handle it.` : "Your cart is empty for now." }),
  merchant: () => ({ id: "intro:merchant", text: "This is the merchant view: how shoppers use me, what they ask, and where product info is missing." }),
};

const CONFUSING: TipChip = { label: "Something's confusing", action: "feedback" };
const lakhs = (n: number) => (n >= 100_000 ? `${Math.round(n / 10_000) / 10} lakh` : formatNPR(n));

/**
 * Idle check-ins: when the shopper sits still and Pip has nothing element-specific left to
 * say, it asks whether something is in the way. Once per page (per product / category).
 */
export const CHECKINS: Partial<Record<PageType, Builder>> = {
  home: () => ({
    id: "checkin:home",
    text: "Taking a moment? Is anything making it hard to find what you're after?",
    chips: [{ label: "Help me choose", message: "Show me laptops under 1.2 lakh for work" }, CONFUSING, { label: "Just browsing" }],
  }),
  category: (ctx) => {
    if (!ctx.category) return null;
    const noun = CAT_NOUN[ctx.category];
    return {
      id: `checkin:category:${ctx.category}`,
      text: `Not sure which of these ${noun} fits? Tell me what's getting in the way.`,
      chips: [{ label: "Narrow it down", message: `Show me ${noun} under ${lakhs(priceSpread(ctx.category).median)}` }, CONFUSING, { label: "Just browsing" }],
    };
  },
  product: (ctx) => {
    const p = ctx.product;
    if (!p) return null;
    const help: TipChip[] =
      p.stock === 0
        ? [{ label: "Find one in stock", message: `Find something similar to the ${p.name} that's in stock` }]
        : [
            { label: "Cheaper option", message: `Find a cheaper alternative to the ${p.name}` },
            { label: "When would it arrive?", message: "When would my order arrive?" },
          ];
    return { id: `checkin:product:${p.id}`, text: `Anything stopping you from getting the **${p.name}**?`, chips: [...help, CONFUSING, { label: "Just looking" }] };
  },
  cart: (ctx) =>
    ctx.cart.count
      ? { id: "checkin:cart", text: "Anything holding you back? I can check delivery or look for a better price.", chips: [{ label: "Delivery time?", message: "When would my order arrive?" }, CONFUSING, { label: "All good" }] }
      : null,
  checkout: () => ({
    id: "checkin:checkout",
    text: "Stuck on anything here? Tell me and I'll help.",
    chips: [{ label: "Delivery cost?", message: "How much is delivery for this order?" }, CONFUSING, { label: "All good" }],
  }),
};

export function buildTip(topic: string, level: 1 | 2, ctx: TipCtx): Tip | null {
  return TIPS[topic]?.[level]?.(ctx) ?? null;
}
