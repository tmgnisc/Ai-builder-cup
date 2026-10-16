"use client";

import { RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
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
let agentNavAt = 0;
let lastPath: string | null = null;

export function BubbleLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const historyOpen = useChat((s) => s.historyOpen);
  const setHistoryOpen = useChat((s) => s.setHistoryOpen);
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const reset = useChat((s) => s.reset);

  useEffect(() => {
    registerNavigator((to) => {
      agentNavAt = Date.now();
      router.push(to);
    });
    return () => registerNavigator(null);
  }, [router]);

  // The shopper went to another page themselves: a finished agent reply about the last
  // page shouldn't follow them (and would block Pip's tips there). Agent-driven navigation
  // keeps its bubble.
  useEffect(() => {
    if (lastPath === null || lastPath === pathname) return void (lastPath = pathname);
    lastPath = pathname;
    const c = useBubble.getState().content;
    if (c?.kind === "agent" && !useChat.getState().busy && Date.now() - agentNavAt > 5000) useBubble.getState().close("system");
  }, [pathname]);

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
      <Drawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        side="left"
        title="Conversation with Pip"
        description="Everything Pip said and did, with every tool step."
        headerExtra={
          <IconButton
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={!messages.length}
            aria-label="Reset memory"
          >
            <RotateCcw className="size-4" />
          </IconButton>
        }
      >
        {messages.length ? (
          <MessageList messages={messages} busy={busy} />
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">Nothing yet. Click Pip, press “/” or hold V to talk.</p>
        )}
      </Drawer>
    </>
  );
}
