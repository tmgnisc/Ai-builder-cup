import { z } from "zod";
import { addToCart, getCart, removeFromCart } from "@/lib/commerce/cartStore";
import { getProduct, searchProducts } from "@/lib/commerce/catalog";
import { rollFailure, simulateLatency, type ChaosConfig } from "@/lib/commerce/chaos";
import { compareProducts } from "@/lib/commerce/compare";
import { deliveryFor } from "@/lib/commerce/delivery";
import { formatNPR } from "@/lib/commerce/format";
import { CartSchema, CategorySchema, ProductSchema, type CommerceErrorCode } from "@/lib/commerce/schemas";
import { CompareKeySchema } from "./types";

/**
 * Tool registry. Every tool has zod input + output schemas and a handler that talks to the
 * mock commerce layer (same in-memory store and session as /api/cart).
 *
 * There is deliberately no checkout/purchase tool: the agent can only send the user to
 * /checkout, where the user confirms.
 */

export interface ToolContext {
  sessionId: string;
  chaos: ChaosConfig;
}

export class ToolError extends Error {
  constructor(
    readonly code: CommerceErrorCode | "UNKNOWN_TOOL",
    message: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

interface ToolDef<I extends z.ZodType, O extends z.ZodType> {
  description: string;
  input: I;
  output: O;
  mutation?: boolean;
  handler: (input: z.infer<I>, ctx: ToolContext) => z.infer<O> | Promise<z.infer<O>>;
  /** One-line trace summary, e.g. "3 results". */
  summarize: (output: z.infer<O>) => string;
}

function tool<I extends z.ZodType, O extends z.ZodType>(def: ToolDef<I, O>) {
  return def;
}

const DeliverySchema = z.object({
  city: z.string(),
  zone: z.enum(["valley", "outside"]),
  days: z.string(),
  fee: z.number().int(),
  freeOver: z.number().int(),
});


export const TOOLS = {
  search_products: tool({
    description: "Search the catalog with structured filters. Returns matching products, best matches first.",
    input: z.object({
      q: z.string().optional(),
      category: CategorySchema.optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      minRamGB: z.number().optional(),
      minBatteryHours: z.number().optional(),
      maxWeightGrams: z.number().optional(),
      tags: z.array(z.string()).optional(),
      brands: z.array(z.string()).optional(),
      sort: z.enum(["relevance", "price-asc", "price-desc", "rating", "battery", "weight"]).optional(),
      limit: z.number().int().positive().max(24).default(12),
    }),
    output: z.object({ products: z.array(ProductSchema), total: z.number().int(), searched: z.number().int() }),
    handler: (input) => {
      const res = searchProducts(input);
      const searched = searchProducts({ category: input.category }).total;
      return { ...res, searched };
    },
    summarize: (o) => `${o.total} result${o.total === 1 ? "" : "s"} of ${o.searched}`,
  }),

  get_product: tool({
    description: "Fetch one product with full specs and live stock.",
    input: z.object({ productId: z.string() }),
    output: ProductSchema,
    handler: ({ productId }) => {
      const p = getProduct(productId);
      if (!p) throw new ToolError("NOT_FOUND", `No product with id "${productId}".`);
      return p;
    },
    summarize: (p) => `${p.brand} ${p.name}`,
  }),

  compare_products: tool({
    description: "Compare 2–4 products attribute by attribute using catalog values only, with a grounded verdict.",
    input: z.object({
      productIds: z.array(z.string()).min(2).max(4),
      priorities: z.array(CompareKeySchema).optional(),
      context: z.string().optional(),
    }),
    output: z.object({
      productIds: z.array(z.string()),
      winnerId: z.string().nullable(),
      verdict: z.string(),
      advantages: z.record(z.string(), z.array(z.string())),
    }),
    handler: ({ productIds, priorities, context }) => {
      const products = productIds.map((id) => {
        const p = getProduct(id);
        if (!p) throw new ToolError("NOT_FOUND", `No product with id "${id}".`);
        return p;
      });
      const r = compareProducts(products, { priorities, context });
      return { productIds: r.productIds, winnerId: r.winnerId, verdict: r.verdict, advantages: r.advantages };
    },
    summarize: (o) => `${o.productIds.length} products · ${o.winnerId ? "winner found" : "close call"}`,
  }),

  check_stock: tool({
    description: "Check live stock for a product.",
    input: z.object({ productId: z.string() }),
    output: z.object({ productId: z.string(), inStock: z.boolean(), quantity: z.number().int() }),
    handler: ({ productId }) => {
      const p = getProduct(productId);
      if (!p) throw new ToolError("NOT_FOUND", `No product with id "${productId}".`);
      return { productId, inStock: p.stock > 0, quantity: p.stock };
    },
    summarize: (o) => (o.inStock ? `in stock (${o.quantity})` : "out of stock"),
  }),

  get_delivery_info: tool({
    description: "Delivery time and fee for a destination city.",
    input: z.object({ city: z.string().default("Kathmandu"), productId: z.string().optional() }),
    output: DeliverySchema,
    handler: ({ city }) => deliveryFor(city),
    summarize: (o) => `${o.city} · ${o.days}`,
  }),

  add_to_cart: tool({
    description: "Add a product to the user's cart. The runtime always verifies with get_cart afterwards.",
    mutation: true,
    input: z.object({ productId: z.string(), qty: z.number().int().positive().max(5).default(1) }),
    output: z.object({ cart: CartSchema }),
    handler: (input, ctx) => {
      const failure = rollFailure(ctx.chaos, { mutation: true });
      if (failure === "transient") throw new ToolError("TRANSIENT", "Store service unavailable.");
      const r = addToCart(ctx.sessionId, input, { dropWrite: failure === "silent" });
      if (!r.ok) throw new ToolError(r.code, r.message);
      return { cart: r.cart };
    },
    summarize: () => "Added to cart, stock confirmed",
  }),

  remove_from_cart: tool({
    description: "Remove a product line from the user's cart. The runtime always verifies with get_cart afterwards.",
    mutation: true,
    input: z.object({ productId: z.string() }),
    output: z.object({ cart: CartSchema }),
    handler: ({ productId }, ctx) => {
      const failure = rollFailure(ctx.chaos, { mutation: true });
      if (failure === "transient") throw new ToolError("TRANSIENT", "Store service unavailable.");
      const r = removeFromCart(ctx.sessionId, productId, { dropWrite: failure === "silent" });
      if (!r.ok) throw new ToolError(r.code, r.message);
      return { cart: r.cart };
    },
    summarize: () => "Removed from cart",
  }),

  get_cart: tool({
    description: "Read the user's current cart.",
    input: z.object({}),
    output: CartSchema,
    handler: (_input, ctx) => getCart(ctx.sessionId),
    summarize: (c) => `${c.itemCount} item${c.itemCount === 1 ? "" : "s"} · ${formatNPR(c.subtotal)}`,
  }),
} as const;

export type ToolName = keyof typeof TOOLS;
export type ToolInput<N extends ToolName> = z.input<(typeof TOOLS)[N]["input"]>;
export type ToolOutput<N extends ToolName> = z.infer<(typeof TOOLS)[N]["output"]>;

export type ToolOutcome<N extends ToolName = ToolName> =
  | { ok: true; output: ToolOutput<N>; durationMs: number; summary: string }
  | { ok: false; error: { code: string; message: string }; durationMs: number; summary: string };

export function isToolName(name: string): name is ToolName {
  return Object.hasOwn(TOOLS, name);
}

/** Validates input, simulates latency, runs the handler, validates output. Never throws. */
export async function executeTool<N extends ToolName>(name: N, rawInput: unknown, ctx: ToolContext): Promise<ToolOutcome<N>> {
  const started = performance.now();
  const def = TOOLS[name] as unknown as ToolDef<z.ZodType, z.ZodType>;
  type Body = { ok: true; output: unknown; summary: string } | { ok: false; error: { code: string; message: string }; summary: string };
  const done = (o: Body) => ({ ...o, durationMs: Math.round(performance.now() - started) }) as ToolOutcome<N>;

  const parsed = def.input.safeParse(rawInput);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
    return done({ ok: false, error: { code: "INVALID_INPUT", message }, summary: "invalid request" });
  }

  await simulateLatency(ctx.chaos);
  if (!def.mutation && rollFailure(ctx.chaos, { mutation: false })) {
    return done({ ok: false, error: { code: "TRANSIENT", message: "Store service unavailable." }, summary: "service unavailable" });
  }

  try {
    const raw = await def.handler(parsed.data, ctx);
    const out = def.output.safeParse(raw);
    if (!out.success) return done({ ok: false, error: { code: "BAD_OUTPUT", message: "Tool returned malformed data." }, summary: "bad output" });
    return done({ ok: true, output: out.data, summary: def.summarize(out.data) });
  } catch (err) {
    const code = err instanceof ToolError ? err.code : "INTERNAL";
    const message = err instanceof Error ? err.message : "Unknown error";
    let summary: string;
    if (code === "OUT_OF_STOCK") summary = "out of stock";
    else if (code === "NOT_FOUND") summary = "not found";
    else if (code === "TRANSIENT") summary = "service unavailable";
    else if (code === "INVALID_INPUT") summary = "invalid request";
    else summary = code.toLowerCase().replace(/_/g, " ");
    return done({ ok: false, error: { code, message }, summary });
  }
}

/** JSON-schema tool declarations for an LLM (used by the Gemini adapter). */
export function toolDeclarations() {
  return (Object.keys(TOOLS) as ToolName[]).map((name) => ({
    name,
    description: TOOLS[name].description,
    parameters: z.toJSONSchema(TOOLS[name].input, { io: "input" }),
  }));
}

