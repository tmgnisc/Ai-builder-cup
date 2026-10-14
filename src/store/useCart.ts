"use client";

import { create } from "zustand";
import { CommerceError, commerce } from "@/lib/commerce/client";
import { flyToCart } from "@/lib/flyToCart";
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
  /** Non-modal "peek" after an add: the drawer slides in briefly, then away. */
  peeking: boolean;
  /** Most recently added product, so its line can flash in the drawer. */
  lastAddedId: string | null;
  refresh: () => Promise<Cart | null>;
  add: (productId: string, qty?: number) => Promise<Cart | null>;
  setQty: (productId: string, qty: number) => Promise<Cart | null>;
  remove: (productId: string) => Promise<Cart | null>;
  setDrawerOpen: (open: boolean) => void;
  peek: (ms?: number) => void;
  holdPeek: () => void;
  /**
   * Add → verify with a fresh cart read → fly-to-cart → peek. Returns whether the add was verified.
   */
  addWithFeedback: (productId: string, source: Element | null) => Promise<boolean>;
}

let peekTimer: ReturnType<typeof setTimeout> | null = null;

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
    peeking: false,
    lastAddedId: null,
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
    setDrawerOpen: (drawerOpen) => {
      if (peekTimer) clearTimeout(peekTimer);
      set({ drawerOpen, peeking: false });
    },
    peek: (ms = 2400) => {
      if (get().drawerOpen) return;
      if (peekTimer) clearTimeout(peekTimer);
      set({ peeking: true });
      peekTimer = setTimeout(() => set({ peeking: false }), ms);
    },
    holdPeek: () => {
      if (peekTimer) clearTimeout(peekTimer);
    },
    addWithFeedback: async (productId, source) => {
      const before = get().cart?.lines.find((l) => l.productId === productId)?.qty ?? 0;
      const added = await get().add(productId, 1);
      if (!added) return false;
      // Verify against a fresh read: the add response alone can't be trusted (chaos "silent" failures).
      const fresh = await get().refresh();
      const after = fresh?.lines.find((l) => l.productId === productId)?.qty ?? 0;
      if (!fresh || after <= before) {
        set({ error: "The store said yes, but the item isn't in your cart. Please try again." });
        return false;
      }
      set({ lastAddedId: productId });
      await flyToCart(source);
      get().peek();
      return true;
    },
  };
});
