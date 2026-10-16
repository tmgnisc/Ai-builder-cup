"use client";

import { create } from "zustand";
import { MAX_COMPARE, type CompareKey } from "@/lib/commerce/compare";

export { MAX_COMPARE };

interface CompareState {
  ids: string[];
  open: boolean;
  /** Optional context from Pip ("Docker + travel") and priorities used for the verdict. */
  context: string | null;
  priorities: CompareKey[] | null;
  /** Set when the user tries to add a 5th item, so the tray can explain. */
  rejectedAt: number;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  /** Used by the agent: replace the selection and open the drawer with a verdict context. */
  show: (ids: string[], opts?: { context?: string; priorities?: CompareKey[] }) => void;
}

export const useCompare = create<CompareState>()((set, get) => ({
  ids: [],
  open: false,
  context: null,
  priorities: null,
  rejectedAt: 0,
  toggle: (id) => {
    const { ids } = get();
    if (ids.includes(id)) {
      set({ ids: ids.filter((x) => x !== id), context: null, priorities: null });
    } else if (ids.length >= MAX_COMPARE) {
      set({ rejectedAt: Date.now() });
    } else {
      set({ ids: [...ids, id], context: null, priorities: null });
    }
  },
  remove: (id) => {
    const ids = get().ids.filter((x) => x !== id);
    set({ ids, open: ids.length >= 2 ? get().open : false });
  },
  clear: () => set({ ids: [], open: false, context: null, priorities: null }),
  setOpen: (open) => set({ open: open && get().ids.length >= 2 }),
  show: (ids, opts) =>
    set({ ids: ids.slice(0, MAX_COMPARE), open: ids.length >= 2, context: opts?.context ?? null, priorities: opts?.priorities ?? null }),
}));

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__useCompare = useCompare;
}
