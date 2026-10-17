"use client";

import { ToggleButton } from "@heroui/react";
import { Bell, BellOff, MessagesSquare } from "lucide-react";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useChat } from "@/store/useChat";
import { useSignals } from "@/store/useSignals";

/** Header shortcuts for Pip: conversation history and quiet mode. */
export function PipHeaderControls() {
  const count = useChat((s) => s.messages.length);
  const setHistoryOpen = useChat((s) => s.setHistoryOpen);
  const quiet = useSignals((s) => s.quiet);
  const setQuiet = useSignals((s) => s.setQuiet);
  return (
    <>
      <Tooltip content={quiet ? "Pip is quiet: tap to allow tips" : "Quiet mode: Pip stops offering tips"} side="bottom">
        <ToggleButton
          isIconOnly
          variant="ghost"
          isSelected={quiet}
          onChange={setQuiet}
          aria-label="Quiet mode"
          className={buttonClasses({ variant: "ghost", size: "icon", className: "grid place-items-center rounded-full" })}
        >
          {quiet ? <BellOff className="size-4.5 text-accent-text" /> : <Bell className="size-4.5" />}
        </ToggleButton>
      </Tooltip>
      <Tooltip content="Conversation history" side="bottom">
        <IconButton onClick={() => setHistoryOpen(true)} aria-label={`Conversation history, ${count} messages`} className="relative rounded-full">
          <MessagesSquare className="size-4.5" />
          {count > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />}
        </IconButton>
      </Tooltip>
    </>
  );
}
