"use client";

import { Bell, BellOff, MessagesSquare } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useChat } from "@/store/useChat";
import { useSignals } from "@/store/useSignals";

/** Header shortcuts for Pip: conversation history and quiet mode. */
export function PipHeaderControls() {
  const count = useChat((s) => s.messages.length);
  const setHistoryOpen = useChat((s) => s.setHistoryOpen);
  const quiet = useSignals((s) => s.quiet);
  const setQuiet = useSignals((s) => s.setQuiet);
  const btn = "relative grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text";
  return (
    <>
      <Tooltip content={quiet ? "Pip is quiet: tap to allow tips" : "Quiet mode: Pip stops offering tips"} side="bottom">
        <button type="button" onClick={() => setQuiet(!quiet)} aria-pressed={quiet} aria-label={quiet ? "Turn off quiet mode" : "Turn on quiet mode"} className={btn}>
          {quiet ? <BellOff className="size-4.5 text-accent-text" /> : <Bell className="size-4.5" />}
        </button>
      </Tooltip>
      <Tooltip content="Conversation history" side="bottom">
        <button type="button" onClick={() => setHistoryOpen(true)} aria-label={`Conversation history, ${count} messages`} className={btn}>
          <MessagesSquare className="size-4.5" />
          {count > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />}
        </button>
      </Tooltip>
    </>
  );
}
