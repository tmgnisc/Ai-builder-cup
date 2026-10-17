/**
 * Mock merchant analytics for /merchant (static, last 7 days). Product ids point at real
 * catalog entries, and every "missing info" field is one the catalog schema really lacks,
 * so Pip had to say "the catalog doesn't list that".
 */

export interface Kpi {
  key: "assisted" | "completion" | "verified" | "tips";
  label: string;
  value: number;
  format: "int" | "pct";
  /** Change vs the previous 7 days (points for pct KPIs, % for counts). */
  delta: number;
  hint: string;
  /** Daily values, oldest first, for the sparkline. */
  trend: number[];
}

export interface TopQuestion {
  text: string;
  count: number;
  intent: "search" | "compare" | "add" | "delivery" | "question";
  /** Share of these conversations that ended with the shopper's task done. */
  resolved: number;
}

export interface MissingInfo {
  productId: string;
  field: string;
  asks: number;
  example: string;
}

export interface FrictionTheme {
  text: string;
  count: number;
  page: string;
}

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
}

export const PERIOD = "Last 7 days";

export const KPIS: Kpi[] = [
  { key: "assisted", label: "Assisted sessions", value: 1284, format: "int", delta: 18, hint: "Sessions where the shopper talked to Pip or used a tip", trend: [142, 158, 171, 166, 189, 214, 244] },
  { key: "completion", label: "Task completion", value: 71, format: "pct", delta: 6, hint: "Conversations that ended with the shopper's task done", trend: [63, 65, 66, 68, 70, 72, 74] },
  { key: "verified", label: "Cart actions verified", value: 98.6, format: "pct", delta: 0.4, hint: "412 of 418 cart changes confirmed by a fresh get_cart; Pip reported the other 6 honestly", trend: [98, 99, 97, 99, 98, 100, 99] },
  { key: "tips", label: "Tips engaged", value: 23, format: "pct", delta: 4, hint: "Proactive tips the shopper clicked or replied to", trend: [17, 19, 18, 21, 22, 24, 26] },
];

/** Cart actions behind the "verified" KPI. */
export const CART_ACTIONS = { total: 418, verified: 412, caught: 6 };

export const FUNNEL: FunnelStep[] = [
  { key: "visited", label: "Visited the store", value: 9820 },
  { key: "talked", label: "Talked to Pip", value: 1284 },
  { key: "recommended", label: "Saw recommendations", value: 1031 },
  { key: "compared", label: "Compared products", value: 486 },
  { key: "added", label: "Added to cart (verified)", value: 412 },
  { key: "checkout", label: "Started checkout", value: 268 },
];

export const TOP_QUESTIONS: TopQuestion[] = [
  { text: "Laptop under 1.2 lakh for coding", count: 212, intent: "search", resolved: 0.84 },
  { text: "Compare the Swift Go 14 and IdeaPad Slim 5", count: 147, intent: "compare", resolved: 0.9 },
  { text: "Noise-cancelling headphones for flights", count: 118, intent: "search", resolved: 0.81 },
  { text: "Delivery time to Pokhara", count: 96, intent: "delivery", resolved: 0.97 },
  { text: "Is the ThinkPad E14 back in stock?", count: 74, intent: "question", resolved: 0.62 },
  { text: "Phone with the best camera under 80k", count: 69, intent: "search", resolved: 0.74 },
];

export const MISSING_INFO: MissingInfo[] = [
  { productId: "lenovo-ideapad-slim-5-14", field: "Keyboard backlight", asks: 37, example: "Does the IdeaPad Slim 5 have a backlit keyboard?" },
  { productId: "acer-swift-go-14", field: "RAM upgradeable?", asks: 29, example: "Can I upgrade the RAM on the Swift Go 14 later?" },
  { productId: "google-pixel-9", field: "eSIM support", asks: 22, example: "Does the Pixel 9 sold here support dual eSIM?" },
  { productId: "dell-s2722qc", field: "VESA mount size", asks: 18, example: "Will the Dell S2722QC fit my monitor arm?" },
  { productId: "hp-victus-15", field: "Screen brightness (nits)", asks: 15, example: "How bright is the Victus screen outdoors?" },
];

/** Answers to Pip's "Something's confusing" check-in. */
export const FRICTION: FrictionTheme[] = [
  { text: "Hard to tell which laptops have good battery", count: 41, page: "Laptops" },
  { text: "Not sure if 16 GB RAM is enough for Docker", count: 33, page: "Product" },
  { text: "Delivery timeline and cost breakdown isn't clear", count: 27, page: "Checkout" },
  { text: "Too many similar phones to choose from", count: 19, page: "Phones" },
];
