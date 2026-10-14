"use client";

import { create } from "zustand";
import { emptyGuideState, type GuideState } from "@/lib/guide/engine";

/** Session state of Pip's proactive guide (tips seen, escalation, dismiss streak, tour). */
interface GuideStore {
  state: GuideState;
  /** Active tour step index, or null. */
  tourStep: number | null;
  /** Last decision, for the playground's debug panel. */
  lastDecision: string;
  update: (fn: (s: GuideState) => GuideState) => void;
  setTourStep: (step: number | null) => void;
  setLastDecision: (d: string) => void;
  reset: () => void;
}

export const useGuide = create<GuideStore>()((set) => ({
  state: emptyGuideState(),
  tourStep: null,
  lastDecision: "",
  update: (fn) => set((s) => ({ state: fn(s.state) })),
  setTourStep: (tourStep) => set({ tourStep }),
  setLastDecision: (lastDecision) => set({ lastDecision }),
  reset: () => set({ state: emptyGuideState(), tourStep: null }),
}));

const TOUR_KEY = "persona-tour-v1";

export function tourDone(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) !== null;
  } catch {
    return true;
  }
}

export function markTourDone(outcome: "skipped" | "finished") {
  try {
    localStorage.setItem(TOUR_KEY, outcome);
  } catch {
    // private mode: the tour may be offered again next session
  }
}
