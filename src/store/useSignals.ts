"use client";

import { create } from "zustand";
import type { SignalEvent } from "@/lib/signals/nudgeEngine";
import { usePipPosition } from "./usePipPosition";

/**
 * Session-only shopping signals plus Pip's pause/quiet switches. Lives in memory (not
 * persisted, not sent to the server); "Reset memory" clears the signals.
 */

const MAX_EVENTS = 200;

interface SignalsState {
  events: SignalEvent[];
  lastTypingAt: number;
  /** Pip paused by the user: sleeping, no proactive nudges. */
  paused: boolean;
  /** Quiet mode: Pip parks and stays silent unless spoken to (still reacts visually). */
  quiet: boolean;
  record: (event: SignalEvent) => void;
  markTyping: () => void;
  setPaused: (paused: boolean) => void;
  setQuiet: (quiet: boolean) => void;
  reset: () => void;
}

export const useSignals = create<SignalsState>()((set) => ({
  events: [],
  lastTypingAt: 0,
  paused: false,
  quiet: false,
  record: (event) => set((s) => ({ events: [...s.events, event].slice(-MAX_EVENTS) })),
  markTyping: () => set({ lastTypingAt: Date.now() }),
  setPaused: (paused) => set({ paused }),
  setQuiet: (quiet) => {
    set({ quiet });
    const pos = usePipPosition.getState();
    void (quiet ? pos.park("br") : pos.goHome());
  },
  reset: () => set({ events: [] }),
}));
