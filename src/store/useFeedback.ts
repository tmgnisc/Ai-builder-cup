"use client";

import { create } from "zustand";
import { pageName, track } from "@/lib/telemetry";

export interface FeedbackEntry {
  text: string;
  path: string;
  at: number;
}

/**
 * What shoppers say is getting in their way (from Pip's idle check-ins). Kept for this session
 * and reported as telemetry, which the merchant dashboard aggregates.
 */
export const useFeedback = create<{ entries: FeedbackEntry[]; add: (text: string) => void; reset: () => void }>()((set) => ({
  entries: [],
  add: (text) => {
    track("friction", { text: text.slice(0, 200), page: pageName(window.location.pathname) });
    set((s) => ({ entries: [...s.entries, { text, path: window.location.pathname, at: Date.now() }] }));
  },
  reset: () => set({ entries: [] }),
}));
