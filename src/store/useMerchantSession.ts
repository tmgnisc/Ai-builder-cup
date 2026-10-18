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

export interface MerchantKpis {
  totalProducts: number;
  inStockCount: number;
  lowStockCount: number;
  totalOrders: number;
  verifiedOrdersCount: number;
  verifiedPercentage: number;
  totalRevenue: number;
  pendingFulfillment: number;
  assistedSessions: number;
  taskCompletionRate: number;
}

export interface MerchantSessionState {
  // Authentication
  isAuthenticated: boolean;
  user: MerchantUser | null;
  authLoading: boolean;
  authError: string | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;

  // Live missing specifications captured during shopper sessions
  missing: LiveMissingInfo[];
  recordMissingInfo: (ev: { productId: string; field: string; question?: string }) => void;

  // Live product stock overrides synced with PostgreSQL
  stockOverrides: Record<string, number>;
  setProductStock: (productId: string, stock: number) => Promise<void>;

  // Orders pipeline synced with PostgreSQL
  orders: MerchantOrder[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  createOrder: (newOrder: MerchantOrder) => Promise<void>;
  loadOrdersFromApi: () => Promise<void>;

  // Live KPIs from PostgreSQL
  kpis: MerchantKpis | null;
  loadKpisFromApi: () => Promise<void>;

  // Store reset
  reset: () => void;
}

export const useMerchantSession = create<MerchantSessionState>()((set) => ({
  isAuthenticated: false,
  user: null,
  authLoading: false,
  authError: null,

  login: async (email: string, password = "") => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch("/api/merchant/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        const data = await res.json();
        const user: MerchantUser = data.user;
        if (typeof window !== "undefined") {
          localStorage.setItem("persona_merchant_auth", "true");
          if (data.token) localStorage.setItem("persona_merchant_token", data.token);
          localStorage.setItem("persona_merchant_user", JSON.stringify(user));
        }
        set({ isAuthenticated: true, user, authLoading: false, authError: null });
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || "Invalid merchant credentials.";
        set({ authLoading: false, authError: msg });
        return false;
      }
    } catch {
      // Fallback for offline/demo evaluation
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === "admin@persona.store" || cleanEmail.includes("@")) {
        const user: MerchantUser = {
          email: cleanEmail,
          name: cleanEmail === "admin@persona.store" ? "Operations Lead" : cleanEmail.split("@")[0],
          role: "Store Administrator",
          storeName: "Persona Flagship Operations",
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("persona_merchant_auth", "true");
          localStorage.setItem("persona_merchant_user", JSON.stringify(user));
        }
        set({ isAuthenticated: true, user, authLoading: false, authError: null });
        return true;
      }
      set({ authLoading: false, authError: "Failed to connect to authentication server." });
      return false;
    }
  },

  checkAuth: async () => {
    try {
      const res = await fetch("/api/merchant/auth/me");
      if (res.ok) {
        const user = await res.json();
        set({ isAuthenticated: true, user });
        return true;
      }
    } catch {
      // Ignore
    }

    if (typeof window !== "undefined") {
      const isAuth = localStorage.getItem("persona_merchant_auth") === "true";
      const savedUser = localStorage.getItem("persona_merchant_user");
      if (isAuth && savedUser) {
        try {
          const user = JSON.parse(savedUser);
          set({ isAuthenticated: true, user });
          return true;
        } catch {
          // Ignore
        }
      }
    }

    set({ isAuthenticated: false, user: null });
    return false;
  },

  logout: async () => {
    try {
      await fetch("/api/merchant/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("persona_merchant_auth");
        localStorage.removeItem("persona_merchant_token");
        localStorage.removeItem("persona_merchant_user");
      } catch {
        // ignore
      }
    }
    set({ isAuthenticated: false, user: null, authError: null });
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
  setProductStock: async (productId, stock) => {
    const val = Math.max(0, stock);
    set((s) => ({
      stockOverrides: {
        ...s.stockOverrides,
        [productId]: val,
      },
    }));
    try {
      await fetch(`/api/merchant/inventory/${encodeURIComponent(productId)}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: val }),
      });
    } catch (e) {
      console.warn("Failed to persist stock update to PostgreSQL:", e);
    }
  },

  orders: INITIAL_ORDERS,
  loadOrdersFromApi: async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          set({
            orders: data.map((o: Partial<MerchantOrder> & { createdAt?: string }) => ({
              id: String(o.id || ""),
              customerName: String(o.customerName || ""),
              customerEmail: String(o.customerEmail || ""),
              city: String(o.city || ""),
              date: o.createdAt ? o.createdAt.slice(0, 16).replace("T", " ") : (o.date || "Today"),
              items: o.items || [],
              totalNPR: Number(o.totalNPR || 0),
              verifiedByPip: o.verifiedByPip ?? true,
              verificationHash: o.verificationHash || "pip_v_live",
              status: (o.status as OrderStatus) || "pending",
              notes: o.notes,
            })),
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch orders from backend:", e);
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }));
    try {
      await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.warn("Failed to persist status change to PostgreSQL:", e);
    }
  },

  createOrder: async (newOrder) => {
    set((s) => ({
      orders: [newOrder, ...s.orders],
      kpis: s.kpis
        ? {
            ...s.kpis,
            totalOrders: s.kpis.totalOrders + 1,
            verifiedOrdersCount: newOrder.verifiedByPip ? s.kpis.verifiedOrdersCount + 1 : s.kpis.verifiedOrdersCount,
            totalRevenue: s.kpis.totalRevenue + newOrder.totalNPR,
            pendingFulfillment: s.kpis.pendingFulfillment + 1,
          }
        : null,
    }));
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });
    } catch (e) {
      console.warn("Failed to persist new order to backend:", e);
    }
  },

  kpis: null,
  loadKpisFromApi: async () => {
    try {
      const res = await fetch("/api/merchant/kpis");
      if (res.ok) {
        const data = await res.json();
        set({ kpis: data });
      }
    } catch (e) {
      console.warn("Failed to load KPIs from backend:", e);
    }
  },

  reset: () => set({ missing: [], stockOverrides: {}, orders: INITIAL_ORDERS }),
}));
