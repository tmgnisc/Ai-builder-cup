"use client";

import { create } from "zustand";
import { streamAgent } from "@/lib/agent/client";
import { EMPTY_MEMORY, type AgentEvent, type AgentMemory, type Block, type UIAction } from "@/lib/agent/types";
import { useSpotlight } from "@/features/companion";
import { flyToCart } from "@/lib/flyToCart";
import { motion } from "@/lib/motion";
import { useBubble } from "./useBubble";
import { useCart } from "./useCart";
import { PRICE_MAX, PRICE_MIN, useCatalogUI } from "./useCatalogUI";
import { useCompanion } from "./useCompanion";
import { useCompare } from "./useCompare";
import { buildCompareUrl } from "@/lib/commerce/compareUrl";
import { findAnchor, usePipPosition } from "./usePipPosition";
import { useFeedback } from "./useFeedback";
import { useGuide } from "./useGuide";
import { useMerchantSession } from "./useMerchantSession";
import { useSignals } from "./useSignals";
import { useVoice } from "./useVoice";

export interface TraceEntry {
  callId: string;
  name: string;
  status: "running" | "ok" | "error";
  summary?: string;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  blocks: Block[];
  trace: TraceEntry[];
  status: "streaming" | "done" | "error";
}

interface ChatState {
  messages: ChatMessage[];
  busy: boolean;
  memory: AgentMemory;
  /** The History drawer (secondary view of the full conversation). */
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  /** `voice: true` marks a spoken turn: Pip reads its reply aloud (unless muted). */
  send: (text: string, opts?: { voice?: boolean }) => Promise<void>;
  stop: () => void;
  /** "Reset memory": clears the conversation, Pip's agent memory and this session's shopping signals. */
  reset: () => void;
  /** Pause Pip: sleeping, no proactive nudges. Sending a message resumes. */
  setPaused: (paused: boolean) => void;
}

let controller: AbortController | null = null;
let navigate: ((to: string) => void) | null = null;
let userSeq = 0;

/** The bubble layer registers the router so agent `navigate` actions use client-side routing. */
export function registerNavigator(fn: ((to: string) => void) | null) {
  navigate = fn;
}

function pageProductId(): string | null {
  const m = window.location.pathname.match(/^\/product\/([a-z0-9-]+)/);
  return m?.[1] ?? null;
}

/** Element to fly into the cart: a mini card in Pip's bubble if present, else the grid card image. */
function flySource(productId: string): Element | null {
  const chat = document.querySelectorAll(`[data-chat-product="${productId}"]`);
  if (chat.length) return chat[chat.length - 1];
  return document.querySelector(`[data-product-id="${productId}"] [data-card-image]`) ?? document.querySelector("[data-gallery-main]");
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, motion.reduced ? 0 : ms));

/** Waits (up to `ms`) for an anchor to exist and sit on screen, e.g. inside a drawer that's sliding in. */
async function settledAnchor(id: string, ms = 1200): Promise<Element | null> {
  const until = performance.now() + ms;
  for (;;) {
    const el = findAnchor(id);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.top >= 0 && r.bottom <= window.innerHeight + 4) {
        await wait(60);
        return el;
      }
    }
    if (performance.now() > until) return el;
    await new Promise((r) => setTimeout(r, 80));
  }
}

/** Pip sits midway between two elements (e.g. the two cards it's comparing). */
const placeBetween = (other: Element) => (el: Element, size: number) => {
  const a = el.getBoundingClientRect();
  const b = other.getBoundingClientRect();
  if (a.width === 0 || b.width === 0) return null;
  return { x: (a.left + a.right + b.left + b.right) / 4, y: Math.min(a.top, b.top) + Math.min(a.height, b.height) * 0.35 + size * 0.1 };
};

async function performUI(action: UIAction) {
  const pos = usePipPosition.getState();
  switch (action.type) {
    case "highlight": {
      if (action.productIds) useCatalogUI.getState().setHighlighted(action.productIds);
      const el = action.anchorId ? await settledAnchor(action.anchorId, 800) : null;
      if (el) useSpotlight.getState().show(el, { dim: true, ms: 2600 });
      return;
    }
    case "move_to": {
      if (action.between) {
        const [a, b] = action.between.map(findAnchor);
        if (a && b) await pos.flyToAnchor(a, { place: placeBetween(b), size: "anchored" });
        else if (a) await pos.flyToAnchor(a);
      } else if (action.anchorId) {
        const el = await settledAnchor(action.anchorId);
        if (el) await pos.flyToAnchor(el, { size: action.size === "presenting" ? "presenting" : "anchored" });
      } else if (action.corner) {
        await pos.park(action.corner);
      } else if (action.x !== undefined && action.y !== undefined) {
        await pos.flyToPoint({ x: action.x, y: action.y }, { size: action.size ?? "free" });
      }
      return;
    }
    case "scroll_to": {
      const el = findAnchor(action.anchorId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 40) {
        el.scrollIntoView({ block: "center", behavior: motion.reduced ? "auto" : "smooth" });
        await wait(700);
      }
      return;
    }
    case "set_filters": {
      if (window.location.pathname !== "/") return;
      const f = useCatalogUI.getState().filters;
      const max = action.maxPrice ?? PRICE_MAX;
      if (f.category === (action.category ?? null) && f.priceRange[1] >= max && f.priceRange[0] === PRICE_MIN && !f.brands.length) return;
      useCatalogUI.getState().resetFilters({ category: action.category ?? null, priceRange: [PRICE_MIN, Math.min(PRICE_MAX, max)] });
      window.history.replaceState(null, "", action.category ? `/?category=${action.category}#store` : "/#store");
      await wait(450); // let the grid re-flow (Flip) before scrolling to a card
      return;
    }
    case "open_drawer":
      if (action.name === "cart") useCart.getState().peek(4500);
      else if (action.name === "compare") useCompare.getState().setOpen(true);
      else useChat.getState().setHistoryOpen(true);
      return;
    case "open_compare": {
      useCompare.getState().show(action.productIds, { context: action.context, priorities: action.priorities });
      const targetUrl = buildCompareUrl(action.productIds);
      if (navigate) navigate(targetUrl);
      else window.location.assign(targetUrl);
      return;
    }
    case "cart_updated": {
      await useCart.getState().refresh();
      if (action.flyProductId) {
        useCart.setState({ lastAddedId: action.flyProductId });
        // Pip flies to the cart icon alongside the item.
        await Promise.all([flyToCart(flySource(action.flyProductId)), pos.flyToAnchor("cart-button", { size: "anchored" })]);
        useCart.getState().peek();
      }
      return;
    }
    case "navigate":
      if (navigate) navigate(action.to);
      else window.location.assign(action.to);
      return;
  }
}

export const useChat = create<ChatState>()((set, get) => {
  const patch = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) }));

  async function apply(ev: AgentEvent) {
    switch (ev.type) {
      case "state_change":
        useCompanion.getState().dispatch({ type: "state_change", state: ev.state, caption: ev.caption, source: "agent" });
        return;
      case "message_start":
        set((s) => ({ messages: [...s.messages, { id: ev.messageId, role: "assistant", text: "", blocks: [], trace: [], status: "streaming" }] }));
        // Pip speaks through its bubble: every reply replaces whatever it was saying.
        useBubble.getState().show({ kind: "agent", messageId: ev.messageId });
        return;
      case "text_delta":
        patch(ev.messageId, (m) => ({ ...m, text: m.text + ev.delta }));
        return;
      case "tool_call":
        patch(ev.messageId, (m) => ({ ...m, trace: [...m.trace, { callId: ev.callId, name: ev.name, status: "running" }] }));
        return;
      case "tool_result":
        patch(ev.messageId, (m) => ({
          ...m,
          trace: m.trace.map((t) => (t.callId === ev.callId ? { ...t, status: ev.ok ? "ok" : "error", summary: ev.summary, durationMs: ev.durationMs } : t)),
        }));
        return;
      case "block":
        patch(ev.messageId, (m) => {
          const i = m.blocks.findIndex((b) => b.id === ev.block.id);
          const blocks = i === -1 ? [...m.blocks, ev.block] : m.blocks.map((b, j) => (j === i ? ev.block : b));
          return { ...m, blocks };
        });
        return;
      case "ui":
        await performUI(ev.action);
        return;
      case "missing_info":
        useMerchantSession.getState().recordMissingInfo(ev);
        return;
      case "memory":
        set({ memory: ev.memory });
        return;
      case "error":
        set((s) => {
          const last = [...s.messages].reverse().find((m) => m.role === "assistant");
          return last ? { messages: s.messages.map((m) => (m.id === last.id ? { ...m, status: "error" } : m)) } : {};
        });
        return;
      case "done":
        set((s) => ({ messages: s.messages.map((m) => (m.status === "streaming" ? { ...m, status: "done" } : m)) }));
        return;
    }
  }

  return {
    messages: [],
    busy: false,
    memory: EMPTY_MEMORY,
    historyOpen: false,
    setHistoryOpen: (historyOpen) => set({ historyOpen }),
    stop: () => {
      controller?.abort();
      controller = null;
      set((s) => ({ busy: false, messages: s.messages.map((m) => (m.status === "streaming" ? { ...m, status: "done" } : m)) }));
      useCompanion.getState().dispatch({ type: "state_change", state: "idle", source: "agent" });
    },
    reset: () => {
      controller?.abort();
      controller = null;
      useVoice.getState().hush();
      set({ messages: [], memory: EMPTY_MEMORY, busy: false });
      useSignals.getState().reset();
      useGuide.getState().reset();
      useFeedback.getState().reset();
      useMerchantSession.getState().reset();
      useCatalogUI.getState().setHighlighted([]);
      if (!useSignals.getState().paused) useCompanion.getState().dispatch({ type: "state_change", state: "idle", source: "agent" });
    },
    setPaused: (paused) => {
      useSignals.getState().setPaused(paused);
      if (paused) {
        controller?.abort();
        controller = null;
        useVoice.getState().hush();
        useVoice.getState().stop();
        set({ busy: false });
      }
      useCompanion.getState().dispatch({ type: "state_change", state: paused ? "sleeping" : "idle", source: "session" });
    },
    send: async (raw, opts = {}) => {
      const text = raw.trim();
      if (!text) return;
      // A tip can answer replies itself (e.g. "skip" during the tour offer).
      const bubble = useBubble.getState().content;
      if (bubble?.kind === "tip" && bubble.onReply?.(text)) {
        set((s) => ({ messages: [...s.messages, { id: `user_${++userSeq}`, role: "user", text, blocks: [], trace: [], status: "done" }] }));
        return;
      }
      // Talking to Pip wakes it up.
      if (useSignals.getState().paused) useSignals.getState().setPaused(false);
      useVoice.getState().hush();
      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;

      set((s) => ({
        busy: true,
        messages: [...s.messages, { id: `user_${++userSeq}`, role: "user", text, blocks: [], trace: [], status: "done" }],
      }));

      const request = {
        message: text,
        memory: get().memory,
        context: {
          pageProductId: pageProductId(),
          compareIds: useCompare.getState().ids,
          cartProductIds: useCart.getState().cart?.lines.map((l) => l.productId) ?? [],
          path: window.location.pathname,
        },
      };

      try {
        for await (const ev of streamAgent(request, ctrl.signal)) {
          if (ctrl.signal.aborted) break;
          await apply(ev);
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const id = `err_${Date.now()}`;
        set((s) => ({
          messages: [
            ...s.messages,
            { id, role: "assistant", text: "I couldn't reach the store just now, so I haven't done anything. Please try again.", blocks: [], trace: [], status: "error" },
          ],
        }));
        useCompanion.getState().dispatch({ type: "state_change", state: "error", caption: "Connection problem", source: "agent" });
        console.warn("[agent]", err);
      } finally {
        if (controller === ctrl) {
          controller = null;
          set({ busy: false });
          if (opts.voice && !ctrl.signal.aborted) {
            const reply = [...get().messages].reverse().find((m) => m.role === "assistant");
            if (reply?.text) useVoice.getState().say(reply.text);
          }
        }
      }
    },
  };
});

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__useChat = useChat;
  (window as unknown as Record<string, unknown>).useChat = useChat;
}
