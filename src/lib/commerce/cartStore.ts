import { getProduct } from "./catalog";
import type { AddToCartInput, Cart, CartLine, CommerceErrorCode, SetQtyInput } from "./schemas";

/**
 * Server-side in-memory cart store, keyed by session id. This is the source of truth;
 * the client Zustand cart mirrors it.
 *
 * Held on globalThis so it survives dev hot reloads. Single-process only: on serverless
 * platforms separate instances would not share carts (run `next start` for the demo).
 */

type CartData = { qty: Map<string, number>; updatedAt: string };

interface StoreGlobal {
  __personaCarts?: Map<string, CartData>;
}

const g = globalThis as StoreGlobal;
const carts: Map<string, CartData> = (g.__personaCarts ??= new Map());

export type CartResult = { ok: true; cart: Cart } | { ok: false; code: CommerceErrorCode; message: string };

interface MutationOptions {
  /** Chaos "silent" failure: report success without persisting. */
  dropWrite?: boolean;
}

function data(sessionId: string): CartData {
  let c = carts.get(sessionId);
  if (!c) {
    c = { qty: new Map(), updatedAt: new Date().toISOString() };
    carts.set(sessionId, c);
  }
  return c;
}

function toCart(qty: Map<string, number>, updatedAt: string): Cart {
  const lines: CartLine[] = [];
  for (const [productId, q] of qty) {
    const p = getProduct(productId);
    if (!p || q <= 0) continue;
    lines.push({ productId, name: `${p.brand} ${p.name}`, unitPrice: p.price, qty: q, lineTotal: p.price * q });
  }
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
    updatedAt,
  };
}

/** Applies `next` to a copy; persists only if the write isn't dropped. */
function commit(sessionId: string, next: Map<string, number>, opts: MutationOptions): CartResult {
  const updatedAt = new Date().toISOString();
  if (!opts.dropWrite) {
    const c = data(sessionId);
    c.qty = next;
    c.updatedAt = updatedAt;
  }
  return { ok: true, cart: toCart(next, updatedAt) };
}

export function getCart(sessionId: string): Cart {
  const c = data(sessionId);
  return toCart(c.qty, c.updatedAt);
}

export function addToCart(sessionId: string, input: AddToCartInput, opts: MutationOptions = {}): CartResult {
  const p = getProduct(input.productId);
  if (!p) return { ok: false, code: "NOT_FOUND", message: `No product with id "${input.productId}".` };
  if (p.stock === 0) {
    return { ok: false, code: "OUT_OF_STOCK", message: `${p.brand} ${p.name} is out of stock.` };
  }
  const current = data(sessionId).qty;
  const desired = (current.get(p.id) ?? 0) + input.qty;
  if (desired > p.stock) {
    return {
      ok: false,
      code: "INSUFFICIENT_STOCK",
      message: `Only ${p.stock} of ${p.brand} ${p.name} available.`,
    };
  }
  const next = new Map(current);
  next.set(p.id, desired);
  return commit(sessionId, next, opts);
}

export function setQty(sessionId: string, input: SetQtyInput, opts: MutationOptions = {}): CartResult {
  const current = data(sessionId).qty;
  if (!current.has(input.productId)) {
    return { ok: false, code: "NOT_IN_CART", message: "That item isn't in the cart." };
  }
  const p = getProduct(input.productId);
  if (p && input.qty > p.stock) {
    return { ok: false, code: "INSUFFICIENT_STOCK", message: `Only ${p.stock} of ${p.brand} ${p.name} available.` };
  }
  const next = new Map(current);
  if (input.qty === 0) next.delete(input.productId);
  else next.set(input.productId, input.qty);
  return commit(sessionId, next, opts);
}

export function removeFromCart(sessionId: string, productId: string, opts: MutationOptions = {}): CartResult {
  const current = data(sessionId).qty;
  if (!current.has(productId)) {
    return { ok: false, code: "NOT_IN_CART", message: "That item isn't in the cart." };
  }
  const next = new Map(current);
  next.delete(productId);
  return commit(sessionId, next, opts);
}

export function clearCart(sessionId: string): Cart {
  commit(sessionId, new Map(), {});
  return getCart(sessionId);
}
