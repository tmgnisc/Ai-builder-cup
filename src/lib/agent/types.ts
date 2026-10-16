import { z } from "zod";
import { CartLineSchema, CategorySchema } from "@/lib/commerce/schemas";

export const PIP_STATES = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "searching",
  "presenting",
  "comparing",
  "speaking",
  "acting",
  "success",
  "error",
  "sleeping",
] as const;
export type PipState = (typeof PIP_STATES)[number];

/**
 * Agent wire protocol. The server streams these as NDJSON; the client validates every
 * line with `AgentEventSchema` before applying it. Pip's state changes only via
 * `state_change` events.
 */

export const PipStateSchema = z.enum(PIP_STATES);

export const CompareKeySchema = z.enum(["price", "ram", "storage", "battery", "weight", "warranty", "rating"]);

// ── Rich message blocks ──

export const ProductCarouselBlockSchema = z.object({
  kind: z.literal("product_carousel"),
  id: z.string(),
  title: z.string().optional(),
  productIds: z.array(z.string()),
});

export const ComparisonBlockSchema = z.object({
  kind: z.literal("comparison"),
  id: z.string(),
  productIds: z.array(z.string()).min(2),
  verdict: z.string(),
  winnerId: z.string().nullable(),
  context: z.string().optional(),
  priorities: z.array(CompareKeySchema).optional(),
});

export const CartActionBlockSchema = z.object({
  kind: z.literal("cart_action"),
  id: z.string(),
  action: z.enum(["add", "remove"]),
  productId: z.string(),
  status: z.enum(["pending", "verified", "failed"]),
  /** The cart line exactly as returned by get_cart during verification. */
  line: CartLineSchema.nullable().optional(),
  message: z.string().optional(),
});

export const ClarifyBlockSchema = z.object({
  kind: z.literal("clarify"),
  id: z.string(),
  question: z.string().optional(),
  options: z.array(z.string()).min(1).max(5),
});

export const BlockSchema = z.discriminatedUnion("kind", [
  ProductCarouselBlockSchema,
  ComparisonBlockSchema,
  CartActionBlockSchema,
  ClarifyBlockSchema,
]);
export type Block = z.infer<typeof BlockSchema>;

// ── Side effects the UI should perform ──

export const UIActionSchema = z.discriminatedUnion("type", [
  /** Grid "Pip's pick" badges (productIds) and/or a spotlight on one anchor. */
  z.object({ type: z.literal("highlight"), productIds: z.array(z.string()).optional(), anchorId: z.string().optional() }),
  /** Move Pip: beside an anchor, between two anchors, to a corner, or to a point. */
  z.object({
    type: z.literal("move_to"),
    anchorId: z.string().optional(),
    between: z.tuple([z.string(), z.string()]).optional(),
    corner: z.enum(["tl", "tr", "bl", "br"]).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    size: z.enum(["presenting", "anchored", "free"]).optional(),
  }),
  z.object({ type: z.literal("scroll_to"), anchorId: z.string() }),
  /** Make the store grid show what Pip is talking about (category + budget). */
  z.object({ type: z.literal("set_filters"), category: CategorySchema.nullable().optional(), maxPrice: z.number().optional() }),
  z.object({ type: z.literal("open_drawer"), name: z.enum(["cart", "compare", "history"]) }),
  z.object({
    type: z.literal("open_compare"),
    productIds: z.array(z.string()),
    context: z.string().optional(),
    priorities: z.array(CompareKeySchema).optional(),
  }),
  /** Cart changed and was verified; `flyProductId` triggers the fly-to-cart animation. */
  z.object({ type: z.literal("cart_updated"), flyProductId: z.string().optional() }),
  /** Navigation is limited to known pages; purchase always requires the user on /checkout. */
  z.object({ type: z.literal("navigate"), to: z.enum(["/checkout", "/"]) }),
]);
export type UIAction = z.infer<typeof UIActionSchema>;

// ── Memory (client-held, sent with every turn) ──

export const ParsedQuerySchema = z.object({
  category: CategorySchema.optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minRamGB: z.number().optional(),
  minBatteryHours: z.number().optional(),
  maxWeightGrams: z.number().optional(),
  tags: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  /** Human-readable needs, e.g. ["full-stack development", "Docker", "good battery"]. */
  needs: z.array(z.string()),
  priorities: z.array(CompareKeySchema),
  sort: z.enum(["relevance", "price-asc", "price-desc", "rating", "battery", "weight"]).optional(),
  text: z.string().optional(),
});
export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;

export const AgentMemorySchema = z.object({
  lastResultIds: z.array(z.string()).default([]),
  lastComparedIds: z.array(z.string()).default([]),
  lastQuery: ParsedQuerySchema.nullable().default(null),
  /** Product currently being discussed (last added, asked about, or the page product). */
  focusProductId: z.string().nullable().default(null),
  /** Last alternative Pip suggested, so "add that instead" resolves. */
  suggestedId: z.string().nullable().default(null),
  turn: z.number().int().default(0),
});
export type AgentMemory = z.infer<typeof AgentMemorySchema>;
export const EMPTY_MEMORY: AgentMemory = AgentMemorySchema.parse({});

export const AgentContextSchema = z.object({
  pageProductId: z.string().nullable().default(null),
  compareIds: z.array(z.string()).default([]),
  /** Products already in the cart, so alternatives don't suggest them again. */
  cartProductIds: z.array(z.string()).default([]),
  path: z.string().default("/"),
});
export type AgentContext = z.infer<typeof AgentContextSchema>;

export const AgentRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  memory: AgentMemorySchema.default(EMPTY_MEMORY),
  context: AgentContextSchema.default({ pageProductId: null, compareIds: [], cartProductIds: [], path: "/" }),
});
export type AgentRequest = z.infer<typeof AgentRequestSchema>;

// ── Events ──

export const MissingInfoEventSchema = z.object({
  type: z.literal("missing_info"),
  field: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  question: z.string().max(200).optional(),
});

export const AgentEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("state_change"), state: PipStateSchema, caption: z.string().optional() }),
  z.object({ type: z.literal("message_start"), messageId: z.string() }),
  z.object({ type: z.literal("text_delta"), messageId: z.string(), delta: z.string() }),
  z.object({ type: z.literal("tool_call"), messageId: z.string(), callId: z.string(), name: z.string(), input: z.unknown() }),
  z.object({
    type: z.literal("tool_result"),
    messageId: z.string(),
    callId: z.string(),
    name: z.string(),
    ok: z.boolean(),
    summary: z.string(),
    durationMs: z.number(),
    error: z.object({ code: z.string(), message: z.string() }).optional(),
  }),
  z.object({ type: z.literal("block"), messageId: z.string(), block: BlockSchema }),
  z.object({ type: z.literal("ui"), action: UIActionSchema }),
  MissingInfoEventSchema,
  z.object({ type: z.literal("memory"), memory: AgentMemorySchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("done") }),
]);
export type AgentEvent = z.infer<typeof AgentEventSchema>;
