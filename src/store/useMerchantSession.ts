"use client";

import { create } from "zustand";
import type { MerchantAnalytics, MissingInfo } from "@/data/merchant";
import type { MerchantOrder, OrderStatus } from "@/data/merchantOrders";
import { track } from "@/lib/telemetry";

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
  /** Last 7 days, oldest first. */
  revenueTrend: number[];
  /** % change in revenue vs the previous 7 days. */
  revenueDelta: number;
  ordersTrend: number[];
}

type LoadState = "idle" | "loading" | "ready" | "error";

export interface MerchantSessionState {
  // Authentication (httpOnly cookie set by the backend; nothing stored client-side)
  isAuthenticated: boolean;
  user: MerchantUser | null;
  authLoading: boolean;
  authError: string | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;

  // Specs Pip couldn't answer in this shopper's session (also reported as telemetry)
  missing: LiveMissingInfo[];
  recordMissingInfo: (ev: { productId: string; field: string; question?: string }) => void;

  // Live stock per product from the database, plus edits made in this session until the next load
  inventory: Record<string, number> | null;
  inventoryState: LoadState;
  loadInventory: () => Promise<void>;
  stockOverrides: Record<string, number>;
  setProductStock: (productId: string, stock: number) => Promise<boolean>;

  // Orders from the backend
  orders: MerchantOrder[];
  ordersState: LoadState;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  loadOrdersFromApi: () => Promise<void>;

  // KPIs (database counts + telemetry) and analytics (telemetry)
  kpis: MerchantKpis | null;
  kpisState: LoadState;
  loadKpisFromApi: () => Promise<void>;
  analytics: MerchantAnalytics | null;
  analyticsState: LoadState;
  loadAnalytics: () => Promise<void>;

  reset: () => void;
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) {
    // Session expired: send the merchant back to the login screen.
    useMerchantSession.setState({ isAuthenticated: false, user: null });
    return null;
  }
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

function toOrder(o: Partial<MerchantOrder> & { createdAt?: string }): MerchantOrder {
  return {
    id: String(o.id ?? ""),
    customerName: String(o.customerName ?? ""),
    customerEmail: String(o.customerEmail ?? ""),
    city: String(o.city ?? ""),
    date: o.createdAt ?? o.date ?? "",
    items: o.items ?? [],
    totalNPR: Number(o.totalNPR ?? 0),
    verifiedByPip: o.verifiedByPip ?? false,
    verificationHash: o.verificationHash ?? "",
    status: (o.status as OrderStatus) ?? "pending",
    notes: o.notes ?? undefined,
  };
}

export const useMerchantSession = create<MerchantSessionState>()((set, get) => ({
  isAuthenticated: false,
  user: null,
  authLoading: false,
  authError: null,

  login: async (email, password = "") => {
    set({ authLoading: true, authError: null });
    try {
      const res = await fetch("/api/merchant/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: MerchantUser };
        set({ isAuthenticated: true, user: data.user, authLoading: false, authError: null });
        return true;
      }
      const err = await res.json().catch(() => ({}));
      const msg = res.status === 503 ? "The store backend is offline. Try again in a moment." : err?.error?.message || "Invalid email or password.";
      set({ authLoading: false, authError: msg });
      return false;
    } catch {
      set({ authLoading: false, authError: "Couldn't reach the store backend. Check your connection." });
      return false;
    }
  },

  checkAuth: async () => {
    try {
      const res = await fetch("/api/merchant/auth/me", { cache: "no-store" });
      if (res.ok) {
        const user = (await res.json()) as MerchantUser;
        set({ isAuthenticated: true, user });
        return true;
      }
    } catch {
      // Treated as signed out.
    }
    set({ isAuthenticated: false, user: null });
    return false;
  },

  logout: async () => {
    try {
      await fetch("/api/merchant/auth/logout", { method: "POST" });
    } catch {
      // The cookie is cleared server-side; signing out locally is still correct.
    }
    set({
      isAuthenticated: false,
      user: null,
      authError: null,
      orders: [],
      kpis: null,
      analytics: null,
      inventory: null,
      ordersState: "idle",
      kpisState: "idle",
      analyticsState: "idle",
      inventoryState: "idle",
    });
  },

  missing: [],
  recordMissingInfo: (ev) => {
    const field = ev.field.trim();
    const productId = ev.productId.trim();
    track("missing_info", { productId, field, question: ev.question?.slice(0, 200) });
    set((s) => {
      const idx = s.missing.findIndex((m) => m.productId === productId && m.field.toLowerCase() === field.toLowerCase());
      if (idx >= 0) {
        const updated = [...s.missing];
        updated[idx] = { ...updated[idx], asks: updated[idx].asks + 1, example: ev.question?.slice(0, 200) || updated[idx].example, at: Date.now() };
        return { missing: updated };
      }
      return { missing: [...s.missing, { productId, field, asks: 1, example: ev.question?.slice(0, 200) || `What about the ${field}?`, at: Date.now() }] };
    });
  },

  inventory: null,
  inventoryState: "idle",
  loadInventory: async () => {
    set((s) => ({ inventoryState: s.inventory ? s.inventoryState : "loading" }));
    try {
      const data = await getJson<{ id: string; stock: number }[]>("/api/merchant/inventory");
      if (data) set({ inventory: Object.fromEntries(data.map((r) => [r.id, r.stock])), inventoryState: "ready", stockOverrides: {} });
    } catch {
      set({ inventoryState: "error" });
    }
  },

  stockOverrides: {},
  setProductStock: async (productId, stock) => {
    const val = Math.max(0, Math.round(stock));
    const previous = get().stockOverrides[productId];
    set((s) => ({ stockOverrides: { ...s.stockOverrides, [productId]: val } }));
    try {
      const res = await fetch(`/api/merchant/inventory/${encodeURIComponent(productId)}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: val }),
      });
      if (!res.ok) throw new Error(String(res.status));
      void get().loadKpisFromApi();
      return true;
    } catch {
      // Roll back so the table never shows a stock level the store didn't save.
      set((s) => {
        const next = { ...s.stockOverrides };
        if (previous === undefined) delete next[productId];
        else next[productId] = previous;
        return { stockOverrides: next };
      });
      return false;
    }
  },

  orders: [],
  ordersState: "idle",
  loadOrdersFromApi: async () => {
    set((s) => ({ ordersState: s.orders.length ? s.ordersState : "loading" }));
    try {
      const data = await getJson<(Partial<MerchantOrder> & { createdAt?: string })[]>("/api/orders?limit=200");
      if (data) set({ orders: data.map(toOrder), ordersState: "ready" });
    } catch {
      set({ ordersState: "error" });
    }
  },

  updateOrderStatus: async (orderId, status) => {
    const before = get().orders;
    set({ orders: before.map((o) => (o.id === orderId ? { ...o, status } : o)) });
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(String(res.status));
      void get().loadKpisFromApi();
      return true;
    } catch {
      set({ orders: before });
      return false;
    }
  },

  kpis: null,
  kpisState: "idle",
  loadKpisFromApi: async () => {
    set((s) => ({ kpisState: s.kpis ? s.kpisState : "loading" }));
    try {
      const data = await getJson<MerchantKpis>("/api/merchant/kpis");
      if (data) set({ kpis: data, kpisState: "ready" });
    } catch {
      set({ kpisState: "error" });
    }
  },

  analytics: null,
  analyticsState: "idle",
  loadAnalytics: async () => {
    set((s) => ({ analyticsState: s.analytics ? s.analyticsState : "loading" }));
    try {
      const data = await getJson<MerchantAnalytics>("/api/merchant/analytics");
      if (data) set({ analytics: data, analyticsState: "ready" });
    } catch {
      set({ analyticsState: "error" });
    }
  },

  reset: () => set({ missing: [], stockOverrides: {} }),
}));
