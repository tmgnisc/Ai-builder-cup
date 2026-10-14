"use client";

import { create } from "zustand";
import { CommerceError, commerce } from "@/lib/commerce/client";
import type { Cart } from "@/lib/commerce/schemas";

/**
 * Client mirror of the server cart. The server is the source of truth: every action
 * replaces `cart` with what the API returned, and `refresh()` re-reads it.
 */

type Status = "idle" | "loading" | "error";

interface CartState {
  cart: Cart | null;
  status: Status;
  error: string | null;
  /** Product ids with an in-flight mutation (for button spinners). */
  pending: string[];
  drawerOpen: boolean;
  refresh: () => Promise<Cart | null>;
  add: (productId: string, qty?: number) => Promise<Cart | null>;
  setQty: (productId: string, qty: number) => Promise<Cart | null>;
  remove: (productId: string) => Promise<Cart | null>;
  setDrawerOpen: (open: boolean) => void;
}

function message(err: unknown): string {
  return err instanceof CommerceError ? err.message : "Something went wrong.";
}

export const useCart = create<CartState>()((set, get) => {
  async function mutate(productId: string, op: () => Promise<Cart>): Promise<Cart | null> {
    set((s) => ({ pending: [...s.pending, productId], error: null }));
    try {
      const cart = await op();
      set({ cart, status: "idle" });
      return cart;
    } catch (err) {
      set({ status: "error", error: message(err) });
      return null;
    } finally {
      set((s) => ({ pending: s.pending.filter((id) => id !== productId) }));
    }
  }

  return {
    cart: null,
    status: "idle",
    error: null,
    pending: [],
    drawerOpen: false,
    refresh: async () => {
      set({ status: get().cart ? "idle" : "loading" });
      try {
        const cart = await commerce.getCart();
        set({ cart, status: "idle", error: null });
        return cart;
      } catch (err) {
        set({ status: "error", error: message(err) });
        return null;
      }
    },
    add: (productId, qty = 1) => mutate(productId, () => commerce.addToCart({ productId, qty })),
    setQty: (productId, qty) => mutate(productId, () => commerce.setQty({ productId, qty })),
    remove: (productId) => mutate(productId, () => commerce.removeFromCart(productId)),
    setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  };
});
