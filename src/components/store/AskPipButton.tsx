"use client";

import { MessageCircle } from "lucide-react";
import { useRef } from "react";
import { pip } from "@/components/companion/runtime";

/** "Ask Pip about this". Phase 4 opens the chat dock with this product as context. */
export function AskPipButton({ productName }: { productName: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        pip.react("hop");
        if (ref.current) pip.glanceAtElement(ref.current, 1200);
      }}
      onPointerEnter={() => ref.current && pip.glanceAtElement(ref.current, 900)}
      aria-label={`Ask Pip about the ${productName}`}
      className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium text-text shadow-[inset_0_0_0_1px_var(--border-strong)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--accent-text)]"
    >
      <MessageCircle className="size-4 text-accent-text" aria-hidden />
      Ask Pip about this
    </button>
  );
}
