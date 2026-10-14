"use client";

import { create } from "zustand";

export interface FeedbackEntry {
  text: string;
  path: string;
  at: number;
}

/**
 * What shoppers say is getting in their way (from Pip's idle check-ins). Session-only for
 * now; the merchant dashboard will read it.
 */
export const useFeedback = create<{ entries: FeedbackEntry[]; add: (text: string) => void; reset: () => void }>()((set) => ({
  entries: [],
  add: (text) => set((s) => ({ entries: [...s.entries, { text, path: window.location.pathname, at: Date.now() }] })),
  reset: () => set({ entries: [] }),
}));
