"use client";

import { MessageCircle } from "lucide-react";
import { useRef } from "react";
import { pip } from "@/features/companion";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { cn } from "@/lib/cn";
import { useChat } from "@/store/useChat";

/** "Ask Pip about this": opens the chat with this product as context (the agent reads the page product). */
export function AskPipButton({ productName, className }: { productName: string; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const send = useChat((s) => s.send);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => void send(`Tell me about the ${productName}`)}
      onPointerEnter={() => ref.current && pip.glanceAtElement(ref.current, 900)}
      aria-label={`Ask Pip about this: ${productName}`}
      className={cn(buttonClasses({ variant: "secondary", size: "lg" }), "text-sm", className)}
    >
      <MessageCircle className="size-4 text-accent-text" aria-hidden />
      Ask Pip
    </button>
  );
}
