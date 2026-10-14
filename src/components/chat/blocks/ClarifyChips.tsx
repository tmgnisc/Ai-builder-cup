"use client";

import { useChat } from "@/store/useChat";

/** Quick replies. Only the latest message's chips are clickable. */
export function ClarifyChips({ question, options, interactive }: { question?: string; options: string[]; interactive: boolean }) {
  const send = useChat((s) => s.send);
  if (!interactive) return null;
  return (
    <div className="mt-2.5">
      {question && <p className="mb-1.5 text-xs text-muted">{question}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => send(o)}
            className="rounded-full bg-surface px-3 py-1.5 text-left text-xs text-text transition-colors hairline hover:bg-accent hover:text-accent-fg"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
