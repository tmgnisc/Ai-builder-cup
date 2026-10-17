"use client";

import { create } from "zustand";
import type { MissingInfo } from "@/data/merchant";
import { INITIAL_ORDERS, type MerchantOrder, type OrderStatus } from "@/data/merchantOrders";

export interface LiveMissingInfo extends MissingInfo {
  at: number;
}

export interface MerchantUser {
  email: string;
  name: string;
  role: string;
  storeName: string;
}

export interface MerchantSessionState {
  // Authentication
  isAuthenticated: boolean;
  user: MerchantUser | null;
  login: (email: string, password?: string) => boolean;
  logout: () => void;

  // Live missing specifications captured during shopper sessions
  missing: LiveMissingInfo[];
  recordMissingInfo: (ev: { productId: string; field: string; question?: string }) => void;

  // Live product stock overrides
  stockOverrides: Record<string, number>;
  setProductStock: (productId: string, stock: number) => void;

  // Orders pipeline
  orders: MerchantOrder[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Store reset
  reset: () => void;
}

export const useMerchantSession = create<MerchantSessionState>()((set) => ({
  isAuthenticated: false,
  user: null,

  login: (email: string, _password?: string) => {
    void _password;
    const cleanEmail = email.trim().toLowerCase();
    // Valid for demo credentials or standard store login
    if (cleanEmail === "admin@persona.store" || cleanEmail.includes("@")) {
      const user: MerchantUser = {
        email: cleanEmail,
        name: cleanEmail === "admin@persona.store" ? "Operations Lead" : cleanEmail.split("@")[0],
        role: "Store Administrator",
        storeName: "Persona Flagship Operations",
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("persona_merchant_auth", "true");
          localStorage.setItem("persona_merchant_user", JSON.stringify(user));
        } catch {
          // ignore localStorage errors in sandboxed environments
        }
      }
      set({ isAuthenticated: true, user });
      return true;
    }
    return false;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("persona_merchant_auth");
        localStorage.removeItem("persona_merchant_user");
      } catch {
        // ignore
      }
    }
    set({ isAuthenticated: false, user: null });
  },

  missing: [],
  recordMissingInfo: (ev) =>
    set((s) => {
      const fieldClean = ev.field.trim();
      const productClean = ev.productId.trim();
      const idx = s.missing.findIndex(
        (m) => m.productId === productClean && m.field.toLowerCase() === fieldClean.toLowerCase()
      );
      if (idx >= 0) {
        const updated = [...s.missing];
        updated[idx] = {
          ...updated[idx],
          asks: updated[idx].asks + 1,
          example: ev.question?.slice(0, 200) || updated[idx].example,
          at: Date.now(),
        };
        return { missing: updated };
      }
      return {
        missing: [
          ...s.missing,
          {
            productId: productClean,
            field: fieldClean,
            asks: 1,
            example: ev.question?.slice(0, 200) || `What about the ${fieldClean}?`,
            at: Date.now(),
          },
        ],
      };
    }),

  stockOverrides: {},
  setProductStock: (productId, stock) =>
    set((s) => ({
      stockOverrides: {
        ...s.stockOverrides,
        [productId]: Math.max(0, stock),
      },
    })),

  orders: INITIAL_ORDERS,
  updateOrderStatus: (orderId, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    })),

  reset: () => set({ missing: [], stockOverrides: {}, orders: INITIAL_ORDERS }),
}));
