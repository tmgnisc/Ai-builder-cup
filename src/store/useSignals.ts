"use client";

import { create } from "zustand";
import type { Nudge, NudgeType, SignalEvent } from "@/lib/signals/nudgeEngine";
import { usePipPosition } from "./usePipPosition";

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
  /** Quiet mode: Pip parks and stays silent unless spoken to (still reacts visually). */
  quiet: boolean;
  active: Nudge | null;
  firedKeys: string[];
  dismissedTypes: NudgeType[];
  lastNudgeAt: number | null;
  record: (event: SignalEvent) => void;
  markTyping: () => void;
  setPaused: (paused: boolean) => void;
  setQuiet: (quiet: boolean) => void;
  show: (nudge: Nudge) => void;
  /** Closes the bubble. `forSession` suppresses this nudge type for the rest of the session. */
  dismiss: (forSession: boolean) => void;
  reset: () => void;
}

export const useSignals = create<SignalsState>()((set, get) => ({
  events: [],
  lastTypingAt: 0,
  paused: false,
  quiet: false,
  active: null,
  firedKeys: [],
  dismissedTypes: [],
  lastNudgeAt: null,
  record: (event) => set((s) => ({ events: [...s.events, event].slice(-MAX_EVENTS) })),
  markTyping: () => set({ lastTypingAt: Date.now() }),
  setPaused: (paused) => set({ paused, active: paused ? null : get().active }),
  setQuiet: (quiet) => {
    set({ quiet, active: quiet ? null : get().active });
    const pos = usePipPosition.getState();
    void (quiet ? pos.park("br") : pos.goHome());
  },
  show: (nudge) => set((s) => ({ active: nudge, firedKeys: [...s.firedKeys, nudge.key], lastNudgeAt: Date.now() })),
  dismiss: (forSession) => {
    const a = get().active;
    set((s) => ({ active: null, dismissedTypes: forSession && a ? [...new Set([...s.dismissedTypes, a.type])] : s.dismissedTypes }));
  },
  reset: () => set({ events: [], active: null, firedKeys: [], dismissedTypes: [], lastNudgeAt: null }),
}));
