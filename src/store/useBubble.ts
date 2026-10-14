"use client";

import { create } from "zustand";

/**
 * Pip's single speech bubble. Only one bubble exists at a time; showing new content
 * replaces the old one (which lives on in History).
 *
 *   agent   a live assistant message (streams in; blocks rendered inline)
 *   prompt  opened by the user (click Pip, "/"): input focused + contextual suggestions
 *   tip     a proactive/system line from the guide engine, with optional chips/cards
 */

export interface BubbleChip {
  label: string;
  /** Sent to Pip as a user message. */
  message?: string;
  /** Or run locally (e.g. "Not now", "Start tour"). */
  run?: () => void;
  primary?: boolean;
}

export type BubbleSource = "agent" | "user" | "guide" | "system";

export type BubbleContent =
  | { kind: "agent"; messageId: string }
  | { kind: "prompt"; suggestions: string[] }
  | {
      kind: "tip";
      id: string;
      text: string;
      chips?: BubbleChip[];
      productIds?: string[];
      source: "guide" | "system";
      /** Proactive tips count toward "dismissed 3 in a row → quiet mode". */
      proactive?: boolean;
    };

export type CloseReason = "user" | "timeout" | "replaced" | "system";

interface BubbleState {
  content: BubbleContent | null;
  /** Increments on every show, so the bubble can cross-fade between contents. */
  key: number;
  inputOpen: boolean;
  shownAt: number;
  lastClose: { at: number; reason: CloseReason; proactive: boolean } | null;
  show: (content: BubbleContent, opts?: { input?: boolean }) => void;
  close: (reason: CloseReason) => void;
  setInputOpen: (open: boolean) => void;
}

const isProactive = (c: BubbleContent | null) => c?.kind === "tip" && !!c.proactive;

export const useBubble = create<BubbleState>()((set, get) => ({
  content: null,
  key: 0,
  inputOpen: false,
  shownAt: 0,
  lastClose: null,
  show: (content, opts = {}) => {
    const prev = get().content;
    if (prev) set({ lastClose: { at: Date.now(), reason: "replaced", proactive: isProactive(prev) } });
    set((s) => ({
      content,
      key: s.key + 1,
      shownAt: Date.now(),
      inputOpen: opts.input ?? (content.kind === "prompt" || (content.kind === "agent" && s.inputOpen)),
    }));
  },
  close: (reason) => {
    const prev = get().content;
    if (!prev) return;
    set({ content: null, inputOpen: false, lastClose: { at: Date.now(), reason, proactive: isProactive(prev) } });
  },
  setInputOpen: (inputOpen) => set({ inputOpen }),
}));

/** Contextual suggestions when the user opens Pip on a given page. */
export function suggestionsFor(pathname: string): string[] {
  if (pathname.startsWith("/product/")) return ["Is this good for coding?", "Compare it with similar ones", "Add it to my cart"];
  if (pathname.startsWith("/checkout")) return ["What's the delivery fee?", "What's in my cart?", "Remove the last item"];
  if (pathname.startsWith("/merchant")) return ["What can Pip do for shoppers?", "Show me laptops", "Help"];
  return ["A laptop under 1.2 lakh for coding", "Noise-cancelling headphones for flights", "Best camera phone below 90k"];
}
