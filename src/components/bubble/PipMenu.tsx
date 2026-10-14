"use client";

import { BellOff, Bell, History, MousePointer2, MoreHorizontal, Pause, Play, RotateCcw, Shield, Volume2, VolumeX } from "lucide-react";
import { usePipPosition } from "@/store/usePipPosition";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useChat } from "@/store/useChat";
import { usePrefs } from "@/store/usePrefs";
import { useSignals } from "@/store/useSignals";
import { useVoice } from "@/store/useVoice";

/** Pip's settings menu (inside the bubble): history, voice, quiet, pause, privacy, reset. */
export function PipMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const muted = usePrefs((s) => s.voiceMuted);
  const setMuted = usePrefs((s) => s.setVoiceMuted);
  const paused = useSignals((s) => s.paused);
  const quiet = useSignals((s) => s.quiet);
  const setQuiet = useSignals((s) => s.setQuiet);
  const setPaused = useChat((s) => s.setPaused);
  const reset = useChat((s) => s.reset);
  const setHistoryOpen = useChat((s) => s.setHistoryOpen);
  const hush = useVoice((s) => s.hush);
  const following = usePipPosition((s) => s.mode === "follow");
  const setFollow = usePipPosition((s) => s.setFollow);

  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), setOpen(false));
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-surface-2";
  const close = () => {
    setOpen(false);
    setPrivacy(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Pip settings"
        className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div role="menu" aria-label="Pip settings" className="absolute right-0 top-8 z-10 w-60 rounded-2xl bg-surface p-1.5 shadow-2xl hairline">
          <button role="menuitem" type="button" className={item} onClick={() => (setHistoryOpen(true), close())}>
            <History className="size-4 text-muted" /> Conversation history
          </button>
          <button
            role="menuitemcheckbox"
            aria-checked={!muted}
            type="button"
            className={item}
            onClick={() => {
              if (!muted) hush();
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX className="size-4 text-muted" /> : <Volume2 className="size-4 text-muted" />} {muted ? "Unmute voice" : "Mute voice (captions stay)"}
          </button>
          <button role="menuitemcheckbox" aria-checked={quiet} type="button" className={item} onClick={() => (setQuiet(!quiet), close())}>
            {quiet ? <Bell className="size-4 text-muted" /> : <BellOff className="size-4 text-muted" />} {quiet ? "Turn off quiet mode" : "Quiet mode (no tips)"}
          </button>
          <button role="menuitemcheckbox" aria-checked={paused} type="button" className={item} onClick={() => (setPaused(!paused), close())}>
            {paused ? <Play className="size-4 text-muted" /> : <Pause className="size-4 text-muted" />} {paused ? "Wake Pip" : "Pause Pip"}
          </button>
          <button role="menuitemcheckbox" aria-checked={following} type="button" className={cn(item, "max-md:hidden")} onClick={() => (setFollow(!following), close())}>
            <MousePointer2 className="size-4 text-muted" /> {following ? "Stop following me" : "Follow my cursor"}
          </button>
          <button role="menuitem" type="button" aria-expanded={privacy} className={item} onClick={() => setPrivacy((p) => !p)}>
            <Shield className="size-4 text-muted" /> What Pip knows
          </button>
          {privacy && (
            <div className="mx-1 mb-1 rounded-xl bg-surface-2 p-3 text-[11.5px] leading-relaxed text-muted">
              <p>
                <span className="text-text">Your messages</span> and a short memory of the conversation go to this store&apos;s server only when you talk to Pip.
              </p>
              <p className="mt-1.5">
                <span className="text-text">Browsing signals</span> (views, filters, where you pause, cart and compare actions) stay in your browser and only power Pip&apos;s tips.
              </p>
              <p className="mt-1.5">
                <span className="text-text">Microphone</span> is used only while you hold or tap the mic; your browser&apos;s speech service transcribes it (Chrome uses Google&apos;s).
              </p>
              <p className="mt-1.5">Nothing is stored after you close the tab. Pip never checks out or pays.</p>
            </div>
          )}
          <button role="menuitem" type="button" className={cn(item, "text-danger hover:bg-danger/10")} onClick={() => (reset(), close())}>
            <RotateCcw className="size-4" /> Reset memory
          </button>
        </div>
      )}
    </div>
  );
}
