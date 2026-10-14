"use client";

import { create } from "zustand";
import type { Nudge, NudgeType, SignalEvent } from "@/lib/signals/nudgeEngine";

/**
 * Session-only shopping signals and nudge bookkeeping. Lives in memory (not persisted,
 * not sent to the server); "Reset memory" clears it.
 */

const MAX_EVENTS = 200;

interface SignalsState {
  events: SignalEvent[];
  lastTypingAt: number;
  /** Pip paused by the user: sleeping, no proactive nudges. */
  paused: boolean;
  active: Nudge | null;
  firedKeys: string[];
  dismissedTypes: NudgeType[];
  lastNudgeAt: number | null;
  record: (event: SignalEvent) => void;
  markTyping: () => void;
  setPaused: (paused: boolean) => void;
  show: (nudge: Nudge) => void;
  /** Closes the bubble. `forSession` suppresses this nudge type for the rest of the session. */
  dismiss: (forSession: boolean) => void;
  reset: () => void;
}

export const useSignals = create<SignalsState>()((set, get) => ({
  events: [],
  lastTypingAt: 0,
  paused: false,
  active: null,
  firedKeys: [],
  dismissedTypes: [],
  lastNudgeAt: null,
  record: (event) => set((s) => ({ events: [...s.events, event].slice(-MAX_EVENTS) })),
  markTyping: () => set({ lastTypingAt: Date.now() }),
  setPaused: (paused) => set({ paused, active: paused ? null : get().active }),
  show: (nudge) => set((s) => ({ active: nudge, firedKeys: [...s.firedKeys, nudge.key], lastNudgeAt: Date.now() })),
  dismiss: (forSession) => {
    const a = get().active;
    set((s) => ({ active: null, dismissedTypes: forSession && a ? [...new Set([...s.dismissedTypes, a.type])] : s.dismissedTypes }));
  },
  reset: () => set({ events: [], active: null, firedKeys: [], dismissedTypes: [], lastNudgeAt: null }),
}));
