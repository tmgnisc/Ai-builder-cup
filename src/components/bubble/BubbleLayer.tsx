"use client";

import { RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { Sheet } from "@/components/ui/Sheet";
import { suggestionsFor, useBubble } from "@/store/useBubble";
import { registerNavigator, useChat } from "@/store/useChat";
import { useVoice } from "@/store/useVoice";
import { SpeechBubble } from "./SpeechBubble";

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/** Opens Pip's prompt bubble (same as clicking Pip). */
export function openPipPrompt(pathname = window.location.pathname) {
  useBubble.getState().show({ kind: "prompt", suggestions: suggestionsFor(pathname) }, { input: true });
}

/**
 * Everything around Pip's voice: the speech bubble, the History drawer, router registration
 * for agent navigation, and global shortcuts ("/" to talk, hold V for push-to-talk).
 */
export function BubbleLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const historyOpen = useChat((s) => s.historyOpen);
  const setHistoryOpen = useChat((s) => s.setHistoryOpen);
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const reset = useChat((s) => s.reset);

  useEffect(() => {
    registerNavigator((to) => router.push(to));
    return () => registerNavigator(null);
  }, [router]);

  useEffect(() => {
    let pttHeld = false;
    const onDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        openPipPrompt(pathname);
      } else if ((e.key === "v" || e.key === "V") && !e.repeat && !pttHeld) {
        pttHeld = true;
        void useVoice.getState().start((text) => void useChat.getState().send(text, { voice: true }));
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if ((e.key === "v" || e.key === "V") && pttHeld) {
        pttHeld = false;
        useVoice.getState().stop();
      }
    };
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup", onUp);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
    };
  }, [pathname]);

  return (
    <>
      <SpeechBubble />
      <Sheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        side="left"
        title="Conversation with Pip"
        description="Everything Pip said and did, with every tool step."
        headerExtra={
          <button
            type="button"
            onClick={reset}
            disabled={!messages.length}
            aria-label="Reset memory"
            title="Reset memory"
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text disabled:opacity-40"
          >
            <RotateCcw className="size-4" />
          </button>
        }
      >
        {messages.length ? (
          <MessageList messages={messages} busy={busy} />
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">Nothing yet. Click Pip, press “/” or hold V to talk.</p>
        )}
      </Sheet>
    </>
  );
}
