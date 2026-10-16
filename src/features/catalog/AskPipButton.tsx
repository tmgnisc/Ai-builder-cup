"use client";

import { MessageCircle } from "lucide-react";
import { useRef } from "react";
import { pip } from "@/components/companion/runtime";
import { useChat } from "@/store/useChat";

/** "Ask Pip about this": opens the chat with this product as context (the agent reads the page product). */
export function AskPipButton({ productName }: { productName: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const send = useChat((s) => s.send);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => void send(`Tell me about the ${productName}`)}
      onPointerEnter={() => ref.current && pip.glanceAtElement(ref.current, 900)}
      aria-label={`Ask Pip about this: ${productName}`}
      className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium text-text shadow-[inset_0_0_0_1px_var(--border-strong)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--accent-text)]"
    >
      <MessageCircle className="size-4 text-accent-text" aria-hidden />
      Ask Pip about this
    </button>
  );
}
