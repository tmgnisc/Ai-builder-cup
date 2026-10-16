"use client";

import { create } from "zustand";
import { STATES, type PipState } from "@/features/companion";

/**
 * Pip's agent-state machine. `state` changes ONLY through `dispatch()` with an event.
 * In Phase 4 the agent event stream feeds this; the mic, nudge engine and the dev
 * playground use the same entry point. Transient reactions (gaze, hops, glances) live
 * in `companion/runtime.ts` and never change `state`.
 */

export type CompanionEventSource = "agent" | "voice" | "nudge" | "session" | "dev";

export type CompanionEvent =
  | { type: "state_change"; state: PipState; caption?: string; source: CompanionEventSource }
  | { type: "caption"; caption: string; source: CompanionEventSource };

interface CompanionStore {
  state: PipState;
  caption: string;
  /** Monotonic counter: bumps on every state change, including re-entering the same state. */
  revision: number;
  lastEvent: CompanionEvent | null;
  dispatch: (event: CompanionEvent) => void;
}

let settleTimer: ReturnType<typeof setTimeout> | null = null;

export const useCompanion = create<CompanionStore>()((set, get) => ({
  state: "idle",
  caption: "",
  revision: 0,
  lastEvent: null,
  dispatch: (event) => {
    if (event.type === "caption") {
      set({ caption: event.caption, lastEvent: event });
      return;
    }
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
    const def = STATES[event.state];
    set({
      state: event.state,
      caption: event.caption ?? def.caption,
      revision: get().revision + 1,
      lastEvent: event,
    });
    if (def.settle) {
      const { afterMs, to } = def.settle;
      settleTimer = setTimeout(() => {
        settleTimer = null;
        if (get().state === event.state) get().dispatch({ type: "state_change", state: to, source: event.source });
      }, afterMs);
    }
  },
}));
