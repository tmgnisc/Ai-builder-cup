"use client";

import { Mic, MicOff, Square } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { isRecognitionSupported } from "@/lib/speech";
import { useMagnetic } from "@/lib/useMagnetic";
import { useChat } from "@/store/useChat";
import { useVoice } from "@/store/useVoice";

const noop = () => () => {};

/** Push-to-talk mic. Starts recognition; the final transcript is sent to Pip as a voice turn. */
export function MicButton({ className, size = 36 }: { className?: string; size?: number }) {
  const listening = useVoice((s) => s.listening);
  const start = useVoice((s) => s.start);
  const stop = useVoice((s) => s.stop);
  const send = useChat((s) => s.send);
  const supported = useSyncExternalStore(noop, isRecognitionSupported, () => true);
  const ref = useRef<HTMLSpanElement>(null);
  useMagnetic(ref, 0.3);

  const label = !supported ? "Voice input isn't supported in this browser" : listening ? "Stop listening" : "Speak to Pip";

  return (
    <span ref={ref} className="inline-flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={listening}
        disabled={!supported}
        onClick={() => (listening ? stop() : void start((text) => void send(text, { voice: true })))}
        className={cn(
          "relative grid shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40",
          listening ? "bg-listening text-bg" : "text-muted hover:bg-surface-2 hover:text-text",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-listening/40 motion-reduce:animate-none" />}
        {!supported ? <MicOff className="size-4" /> : listening ? <Square className="relative size-3.5 fill-current" /> : <Mic className="size-[18px]" />}
      </button>
    </span>
  );
}
