"use client";

import { ArrowUp, Pause, Play, RotateCcw, Square, Volume2, VolumeX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pipRuntime } from "@/components/companion/runtime";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { cn } from "@/lib/cn";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { registerNavigator, useChat } from "@/store/useChat";
import { useCompanion } from "@/store/useCompanion";
import { usePrefs } from "@/store/usePrefs";
import { useSignals } from "@/store/useSignals";
import { useVoice } from "@/store/useVoice";
import { MessageList } from "./MessageList";
import { MicButton } from "./MicButton";
import { MiniPip } from "./MiniPip";
import { PrivacyPopover } from "./PrivacyPopover";

const EXAMPLES = ["A laptop under 1.2 lakh for coding", "Noise-cancelling headphones for flights", "What's in my cart?"];

/**
 * Chat dock. Desktop: a glass panel to the left of the docked Pip. Mobile: a bottom sheet.
 * Opens with a circular reveal that grows out of Pip's on-screen position.
 */
export function ChatDock() {
  const open = useChat((s) => s.open);
  const setOpen = useChat((s) => s.setOpen);
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const send = useChat((s) => s.send);
  const stop = useChat((s) => s.stop);
  const reset = useChat((s) => s.reset);
  const caption = useCompanion((s) => s.caption);
  const setPaused = useChat((s) => s.setPaused);
  const paused = useSignals((s) => s.paused);
  const muted = usePrefs((s) => s.voiceMuted);
  const setMuted = usePrefs((s) => s.setVoiceMuted);
  const listening = useVoice((s) => s.listening);
  const interim = useVoice((s) => s.interim);
  const voiceError = useVoice((s) => s.error);
  const hush = useVoice((s) => s.hush);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registerNavigator((to) => router.push(to));
    return () => registerNavigator(null);
  }, [router]);

  // Open/close: clip-path circle centred on Pip.
  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      const ox = pipRuntime.displaySize ? pipRuntime.center.x - r.left : r.width;
      const oy = pipRuntime.displaySize ? pipRuntime.center.y - r.top : r.height;
      const radius = Math.hypot(Math.max(ox, r.width - ox), Math.max(oy, r.height - oy)) + 20;
      if (open) {
        setVisible(true);
        if (motion.reduced) return;
        gsap.fromTo(
          panel,
          { clipPath: `circle(0px at ${ox}px ${oy}px)` },
          { clipPath: `circle(${radius}px at ${ox}px ${oy}px)`, duration: 0.7, ease: "expo.out", clearProps: "clipPath" },
        );
        gsap.from(panel.querySelectorAll("[data-dock-fade]"), { autoAlpha: 0, y: 10, duration: 0.5, ease: "expo.out", stagger: 0.05, delay: 0.15 });
        window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 250);
      } else if (visible) {
        if (motion.reduced) {
          setVisible(false);
          return;
        }
        gsap.to(panel, {
          clipPath: `circle(0px at ${ox}px ${oy}px)`,
          duration: 0.4,
          ease: "power3.in",
          onComplete: () => {
            gsap.set(panel, { clearProps: "clipPath" });
            setVisible(false);
          },
        });
      }
    },
    { dependencies: [open] },
  );

  // Escape closes the dock (when focus is inside it).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelRef.current?.contains(document.activeElement)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft.trim()) return;
    void send(draft);
    setDraft("");
  }

  return (
    <section
      ref={panelRef}
      aria-label="Chat with Pip"
      inert={!open}
      className={cn(
        "glass fixed z-40 flex flex-col overflow-hidden rounded-[var(--radius-panel)]",
        "inset-x-2 bottom-2 h-[min(80dvh,680px)]",
        "md:inset-x-auto md:bottom-6 md:right-[200px] md:h-[min(660px,calc(100dvh-110px))] md:w-[400px]",
        !visible && "invisible",
      )}
    >
      <header data-dock-fade className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <MiniPip live size={30} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold leading-tight">Pip</p>
          <p className="truncate text-[11px] text-muted">
            <ScrambleText text={paused ? "Paused · no suggestions" : caption || (busy ? "Working…" : "Your shopping companion")} />
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!muted) hush();
            setMuted(!muted);
          }}
          aria-pressed={muted}
          aria-label={muted ? "Unmute Pip's voice" : "Mute Pip's voice (captions stay on)"}
          title={muted ? "Unmute voice" : "Mute voice"}
          className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          aria-label={paused ? "Resume Pip" : "Pause Pip (stops suggestions)"}
          title={paused ? "Resume Pip" : "Pause Pip"}
          className={cn("grid size-8 place-items-center rounded-full hover:bg-surface-2 hover:text-text", paused ? "text-accent-text" : "text-muted")}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
        <PrivacyPopover />
        <button
          type="button"
          onClick={reset}
          aria-label="Reset memory: forget this chat and session signals"
          title="Reset memory"
          className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        >
          <RotateCcw className="size-4" />
        </button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text">
          <X className="size-4" />
        </button>
      </header>

      {messages.length === 0 ? (
        <div data-dock-fade className="flex flex-1 flex-col justify-end gap-3 px-4 pb-4">
          <p className="font-display text-lg font-semibold leading-snug">What are you shopping for?</p>
          <p className="text-sm text-muted">Describe it in your own words: budget, what it&apos;s for, what matters most. I&apos;ll show every step I take.</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => send(ex)} className="rounded-full bg-surface px-3 py-1.5 text-xs hairline hover:bg-accent hover:text-accent-fg">
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <MessageList messages={messages} busy={busy} />
      )}

      <form data-dock-fade onSubmit={submit} className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-[20px] bg-surface p-1.5 pl-3.5 hairline focus-within:shadow-[inset_0_0_0_1px_var(--accent-text)]">
          <label htmlFor="pip-input" className="sr-only">
            Message Pip
          </label>
          <textarea
            id="pip-input"
            ref={inputRef}
            rows={1}
            value={listening ? interim : draft}
            readOnly={listening}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={listening ? "Listening…" : "Ask Pip, or tap the mic…"}
            maxLength={500}
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-[14px] placeholder:text-muted focus:outline-none"
          />
          <MicButton />
          {busy ? (
            <button type="button" onClick={stop} aria-label="Stop" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-text hover:bg-danger/20">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-[filter,opacity] hover:brightness-110 disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
        {voiceError ? (
          <p role="alert" className="mt-1.5 px-1 text-[11px] text-danger">
            {voiceError}
          </p>
        ) : (
          <p className="mt-1.5 px-1 text-[10px] text-muted">Pip can add to your cart but never checks out. You always confirm purchases.</p>
        )}
      </form>
    </section>
  );
}
