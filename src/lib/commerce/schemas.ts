import { z } from "zod";

/**
 * Commerce schemas. These are the single source of truth for catalog and cart shapes;
 * the agent tool registry (Phase 4) reuses them for tool input/output validation.
 */

export const CategorySchema = z.enum(["laptops", "phones", "headphones", "accessories", "clothing"]);
export type Category = z.infer<typeof CategorySchema>;

export const CATEGORIES: readonly { id: Category; label: string }[] = [
  { id: "laptops", label: "Laptops" },
  { id: "phones", label: "Phones" },
  { id: "headphones", label: "Headphones" },
  { id: "accessories", label: "Accessories" },
  { id: "clothing", label: "Clothing" },
];

/** Clothing: how a garment is worn. Drives the virtual try-on rig (which body landmarks it follows). */
export const GarmentSchema = z.enum(["top", "outerwear", "headwear", "eyewear", "shawl"]);
export type Garment = z.infer<typeof GarmentSchema>;

export const ColorOptionSchema = z.object({ name: z.string(), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
export type ColorOption = z.infer<typeof ColorOptionSchema>;

export const ProductSpecsSchema = z.object({
  cpu: z.string().optional(),
  ramGB: z.number().int().positive().optional(),
  storageGB: z.number().int().positive().optional(),
  gpu: z.string().optional(),
  /** Manufacturer-claimed typical use (laptops/phones) or playback (audio). */
  batteryHours: z.number().positive().optional(),
  weightGrams: z.number().int().positive(),
  screen: z.string().optional(),
  warrantyMonths: z.number().int().nonnegative(),
  ports: z.string().optional(),
  connectivity: z.string().optional(),
  anc: z.boolean().optional(),
  camera: z.string().optional(),
  // Clothing
  material: z.string().optional(),
  fit: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(ColorOptionSchema).optional(),
  garment: GarmentSchema.optional(),
  sleeves: z.enum(["none", "short", "long"]).optional(),
  length: z.enum(["waist", "hip", "thigh"]).optional(),
  pattern: z.enum(["solid", "check", "stripe", "dhaka"]).optional(),
});
export type ProductSpecs = z.infer<typeof ProductSpecsSchema>;

export const ProductSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  brand: z.string(),
  category: CategorySchema,
  /** Price in NPR (whole rupees). */
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  blurb: z.string(),
  tags: z.array(z.string()),
  specs: ProductSpecsSchema,
  /** Two colours for the generated gradient placeholder image. */
  palette: z.tuple([z.string(), z.string()]),
});
export type Product = z.infer<typeof ProductSchema>;

export const SortSchema = z.enum(["relevance", "price-asc", "price-desc", "rating", "battery", "weight"]);
export type Sort = z.infer<typeof SortSchema>;

export const ProductQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: CategorySchema.optional(),
  brands: z.array(z.string()).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  minRamGB: z.number().positive().optional(),
  minBatteryHours: z.number().positive().optional(),
  maxWeightGrams: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  inStockOnly: z.boolean().optional(),
  sort: SortSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
});
export type ProductQuery = z.infer<typeof ProductQuerySchema>;

export const ProductSearchResultSchema = z.object({
  products: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
});
export type ProductSearchResult = z.infer<typeof ProductSearchResultSchema>;

export const CartLineSchema = z.object({
  productId: z.string(),
  name: z.string(),
  unitPrice: z.number().int().positive(),
  qty: z.number().int().positive(),
  lineTotal: z.number().int().nonnegative(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const CartSchema = z.object({
  lines: z.array(CartLineSchema),
  itemCount: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
  updatedAt: z.string(),
});
export type Cart = z.infer<typeof CartSchema>;

export const AddToCartInputSchema = z.object({
  productId: z.string(),
  qty: z.number().int().positive().max(10).default(1),
});
export type AddToCartInput = z.infer<typeof AddToCartInputSchema>;

export const SetQtyInputSchema = z.object({
  productId: z.string(),
  qty: z.number().int().nonnegative().max(10),
});
export type SetQtyInput = z.infer<typeof SetQtyInputSchema>;

export const CommerceErrorCodeSchema = z.enum([
  "NOT_FOUND",
  "OUT_OF_STOCK",
  "INSUFFICIENT_STOCK",
  "NOT_IN_CART",
  "INVALID_INPUT",
  "TRANSIENT",
]);
export type CommerceErrorCode = z.infer<typeof CommerceErrorCodeSchema>;

export const CommerceErrorSchema = z.object({
  error: z.object({ code: CommerceErrorCodeSchema, message: z.string() }),
});
export type CommerceErrorBody = z.infer<typeof CommerceErrorSchema>;
