"use client";

/**
 * Speech in/out behind small interfaces so they can be swapped (e.g. for Gemini Live)
 * without touching the UI.
 *  - Recognition: Web Speech API (Chrome/Edge/Safari). Chrome streams audio to Google's
 *    speech service; this is disclosed in the Privacy popover.
 *  - Synthesis: speechSynthesis, with word-boundary events driving Pip's speaking pulse.
 */

// ── Minimal typings (the Web Speech API isn't fully in lib.dom) ──

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent extends Event {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface RecognitionErrorEvent extends Event {
  error: string;
}
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isRecognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

export function isSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface ListenHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}

/** Starts one utterance of recognition. Returns a stop function. */
export function listen(handlers: ListenHandlers, lang = "en-IN"): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError("unsupported");
    handlers.onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = lang; // en-IN handles "lakh", "rupees" and South-Asian English well
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let final = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onInterim((final + interim).trim());
  };
  rec.onerror = (e) => handlers.onError(e.error);
  rec.onend = () => {
    if (final.trim()) handlers.onFinal(final.trim());
    handlers.onEnd();
  };
  rec.start();
  return () => rec.stop();
}

// ── Synthesis ──

export interface SpeakHandlers {
  onStart?: () => void;
  /** Fired on each word boundary (if the voice supports it). */
  onBoundary?: () => void;
  onEnd?: () => void;
}

/** Strips markdown/bullets and normalises currency for natural speech. */
export function toSpeakable(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[•-]\s*/gm, "")
    .replace(/NPR\s?([\d,]+)/g, (_, n: string) => `${n.replace(/,/g, "")} rupees`)
    .replace(/✓|✕/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /en-IN/i.test(v.lang) && /female|google/i.test(v.name)) ??
    voices.find((v) => /en-IN/i.test(v.lang)) ??
    voices.find((v) => /en-(GB|US)/i.test(v.lang) && /google|natural|samantha/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

/** Speaks text; returns a cancel function. No-op (onEnd immediately) when unsupported. */
export function speak(text: string, handlers: SpeakHandlers = {}): () => void {
  if (!isSynthesisSupported() || !text.trim()) {
    handlers.onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(toSpeakable(text));
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.rate = 1.04;
  u.pitch = 1.08;
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    handlers.onEnd?.();
  };
  u.onstart = () => handlers.onStart?.();
  u.onboundary = () => handlers.onBoundary?.();
  u.onend = end;
  u.onerror = end;
  synth.speak(u);
  return () => {
    synth.cancel();
    end();
  };
}
