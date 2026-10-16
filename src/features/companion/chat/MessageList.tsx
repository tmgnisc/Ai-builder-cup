"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/store/useChat";
import { CartActionCard } from "./blocks/CartActionCard";
import { ClarifyChips } from "./blocks/ClarifyChips";
import { ComparisonCard } from "./blocks/ComparisonCard";
import { ProductCarousel } from "./blocks/ProductCarousel";
import { Markdown } from "./Markdown";
import { MiniPip } from "./MiniPip";
import { ToolTrace } from "./ToolTrace";

/** Conversation view. Sticks to the bottom while streaming unless the user has scrolled up. */
export function MessageList({ messages, busy }: { messages: ChatMessage[]; busy: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const signature = messages.map((m) => `${m.id}:${m.text.length}:${m.blocks.length}:${m.trace.length}`).join("|");

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [signature]);

  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-busy={busy}
    >
      <ol className="flex flex-col gap-4">
        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <li key={m.id} className="flex justify-end">
                <p className="max-w-chat-user rounded-card rounded-br-md bg-text px-3.5 py-2 text-sm leading-snug text-bg">{m.text}</p>
              </li>
            );
          }
          const latest = m.id === lastAssistant;
          const streaming = m.status === "streaming";
          return (
            <li key={m.id} className="flex gap-2.5">
              <MiniPip live={latest} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                {(m.text || streaming) && (
                  <div className={cn("text-sm leading-relaxed text-text/90", m.status === "error" && "text-danger")}>
                    <Markdown text={m.text} />
                    {streaming && <span aria-hidden className="caret text-accent-text" />}
                  </div>
                )}
                {m.blocks.map((b) => {
                  switch (b.kind) {
                    case "product_carousel":
                      return <ProductCarousel key={b.id} productIds={b.productIds} title={b.title} interactive={latest && !busy} />;
                    case "comparison":
                      return <ComparisonCard key={b.id} {...b} />;
                    case "cart_action":
                      return <CartActionCard key={b.id} {...b} />;
                    case "clarify":
                      return <ClarifyChips key={b.id} question={b.question} options={b.options} interactive={latest && !streaming} />;
                  }
                })}
                <ToolTrace trace={m.trace} defaultOpen={latest} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
