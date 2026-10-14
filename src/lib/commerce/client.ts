import { z } from "zod";
import { toSearchParams } from "./query";
import {
  CartSchema,
  CommerceErrorSchema,
  ProductSchema,
  type AddToCartInput,
  type Cart,
  type CommerceErrorCode,
  type Product,
  type ProductQuery,
  type ProductSearchResult,
  type SetQtyInput,
} from "./schemas";

/** Browser client for the mock commerce API. Every response is validated with zod. */

export class CommerceError extends Error {
  constructor(
    readonly code: CommerceErrorCode | "NETWORK" | "BAD_RESPONSE",
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}

let chaosRate: number | null = null;

/** Set from `?chaos=` on page load; forwarded as a header so the server can simulate failures. */
export function setClientChaos(rate: number | null) {
  chaosRate = rate;
}

export function getChaosHeader(): string | null {
  return chaosRate === null ? null : String(chaosRate);
}

async function request<S extends z.ZodType>(path: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("content-type", "application/json");
  if (chaosRate !== null) headers.set("x-persona-chaos", String(chaosRate));

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, cache: "no-store" });
  } catch {
    throw new CommerceError("NETWORK", "Couldn't reach the store. Check your connection.");
  }

  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const err = CommerceErrorSchema.safeParse(body);
    if (err.success) throw new CommerceError(err.data.error.code, err.data.error.message, res.status);
    throw new CommerceError("BAD_RESPONSE", `Unexpected ${res.status} from ${path}.`, res.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new CommerceError("BAD_RESPONSE", `Malformed response from ${path}.`, res.status);
  return parsed.data;
}

const SearchResponse = z.object({ products: z.array(ProductSchema), total: z.number(), tookMs: z.number() });
const ProductResponse = z.object({ product: ProductSchema });
const CartResponse = z.object({ cart: CartSchema });

export const commerce = {
  async searchProducts(query: ProductQuery): Promise<ProductSearchResult & { tookMs: number }> {
    return request(`/api/products?${toSearchParams(query)}`, SearchResponse);
  },
  async getProduct(id: string): Promise<Product> {
    return (await request(`/api/products/${encodeURIComponent(id)}`, ProductResponse)).product;
  },
  async getCart(): Promise<Cart> {
    return (await request("/api/cart", CartResponse)).cart;
  },
  async addToCart(input: AddToCartInput): Promise<Cart> {
    return (await request("/api/cart", CartResponse, { method: "POST", body: JSON.stringify(input) })).cart;
  },
  async setQty(input: SetQtyInput): Promise<Cart> {
    return (await request("/api/cart", CartResponse, { method: "PATCH", body: JSON.stringify(input) })).cart;
  },
  async removeFromCart(productId: string): Promise<Cart> {
    const qs = new URLSearchParams({ productId });
    return (await request(`/api/cart?${qs}`, CartResponse, { method: "DELETE" })).cart;
  },
  async clearCart(): Promise<Cart> {
    return (await request("/api/cart", CartResponse, { method: "DELETE" })).cart;
  },
};
