"use client";

import { create } from "zustand";
import type { MissingInfo } from "@/data/merchant";

export interface LiveMissingInfo extends MissingInfo {
  at: number;
}

export interface MerchantSessionState {
  missing: LiveMissingInfo[];
  recordMissingInfo: (ev: { productId: string; field: string; question?: string }) => void;
  reset: () => void;
}

export const useMerchantSession = create<MerchantSessionState>()((set) => ({
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
  reset: () => set({ missing: [] }),
}));
