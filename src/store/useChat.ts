"use client";

import { create } from "zustand";
import { pip } from "@/components/companion/runtime";
import { streamAgent } from "@/lib/agent/client";
import { EMPTY_MEMORY, type AgentEvent, type AgentMemory, type Block, type UIAction } from "@/lib/agent/types";
import { flyToCart } from "@/lib/flyToCart";
import { useCart } from "./useCart";
import { useCatalogUI } from "./useCatalogUI";
import { useCompanion } from "./useCompanion";
import { useCompare } from "./useCompare";

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
  open: boolean;
  messages: ChatMessage[];
  busy: boolean;
  memory: AgentMemory;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  /** Clears the conversation and Pip's memory of it. */
  reset: () => void;
}

let controller: AbortController | null = null;
let navigate: ((to: string) => void) | null = null;
let userSeq = 0;

/** The chat dock registers the router so agent `navigate` actions use client-side routing. */
export function registerNavigator(fn: ((to: string) => void) | null) {
  navigate = fn;
}

function pageProductId(): string | null {
  const m = window.location.pathname.match(/^\/product\/([a-z0-9-]+)/);
  return m?.[1] ?? null;
}

/** Element to fly into the cart: the chat carousel card if present, else the grid card image. */
function flySource(productId: string): Element | null {
  const chat = document.querySelectorAll(`[data-chat-product="${productId}"]`);
  if (chat.length) return chat[chat.length - 1];
  return document.querySelector(`[data-product-id="${productId}"] [data-card-image]`) ?? document.querySelector("[data-gallery-main]");
}

async function performUI(action: UIAction, chatOpen: boolean) {
  switch (action.type) {
    case "highlight": {
      useCatalogUI.getState().setHighlighted(action.productIds);
      const first = document.querySelector(`[data-product-id="${action.productIds[0]}"]`);
      if (first) pip.glanceAtElement(first, 1500);
      return;
    }
    case "open_compare":
      useCompare.getState().show(action.productIds, { context: action.context, priorities: action.priorities });
      return;
    case "cart_updated": {
      await useCart.getState().refresh();
      if (action.flyProductId) {
        useCart.setState({ lastAddedId: action.flyProductId });
        await flyToCart(flySource(action.flyProductId));
        // With the chat open, the cart line already shows in the conversation; don't cover it.
        if (!chatOpen) useCart.getState().peek();
      }
      return;
    }
    case "open_cart":
      if (!chatOpen) useCart.getState().setDrawerOpen(true);
      return;
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
        await performUI(ev.action, get().open);
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
    open: false,
    messages: [],
    busy: false,
    memory: EMPTY_MEMORY,
    setOpen: (open) => set({ open }),
    toggle: () => set((s) => ({ open: !s.open })),
    stop: () => {
      controller?.abort();
      controller = null;
      set((s) => ({ busy: false, messages: s.messages.map((m) => (m.status === "streaming" ? { ...m, status: "done" } : m)) }));
      useCompanion.getState().dispatch({ type: "state_change", state: "idle", source: "agent" });
    },
    reset: () => {
      controller?.abort();
      controller = null;
      set({ messages: [], memory: EMPTY_MEMORY, busy: false });
      useCatalogUI.getState().setHighlighted([]);
      useCompanion.getState().dispatch({ type: "state_change", state: "idle", source: "agent" });
    },
    send: async (raw) => {
      const text = raw.trim();
      if (!text) return;
      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;

      set((s) => ({
        open: true,
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
        }
      }
    },
  };
});
