"use client";

import { create } from "zustand";
import { pip } from "@/features/companion";
import { startMicMeter } from "@/lib/audio";
import { isRecognitionSupported, listen, speak } from "@/lib/speech";
import { useCompanion } from "./useCompanion";
import { usePrefs } from "./usePrefs";

/**
 * Voice I/O. Listening and speaking are reported to Pip as `voice`-source events through
 * the same dispatch the agent uses; mic loudness and speech envelope go to the runtime
 * (they animate Pip without changing its state).
 */

interface VoiceState {
  listening: boolean;
  speaking: boolean;
  interim: string;
  error: string | null;
  start: (onFinal: (text: string) => void) => Promise<void>;
  stop: () => void;
  say: (text: string) => void;
  hush: () => void;
}

let stopRecognition: (() => void) | null = null;
let stopMeter: (() => void) | null = null;
let cancelSpeech: (() => void) | null = null;
let envelope: number | undefined;

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser to talk to Pip.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser to talk to Pip.",
  "no-speech": "I didn't catch anything. Tap the mic and try again.",
  "audio-capture": "No microphone was found.",
  network: "Voice recognition needs a network connection.",
  unsupported: "Voice input isn't supported in this browser. Try Chrome or Edge, or type instead.",
};

const dispatch = (state: "listening" | "speaking" | "idle", caption?: string) =>
  useCompanion.getState().dispatch({ type: "state_change", state, caption, source: "voice" });

export const useVoice = create<VoiceState>()((set, get) => ({
  listening: false,
  speaking: false,
  interim: "",
  error: null,

  start: async (onFinal) => {
    if (get().listening) return;
    get().hush();
    if (!isRecognitionSupported()) {
      set({ error: ERRORS.unsupported });
      return;
    }
    set({ listening: true, interim: "", error: null });
    dispatch("listening", "Listening…");

    // Loudness meter is best-effort; recognition still works without it.
    try {
      stopMeter = await startMicMeter((l) => pip.setMicLevel(l));
    } catch {
      stopMeter = null;
    }

    let gotFinal = false;
    stopRecognition = listen({
      onInterim: (text) => {
        set({ interim: text });
        // Live transcript as Pip's caption; long utterances show their most recent words.
        const tail = text.length > 60 ? `…${text.slice(-58).replace(/^\S*\s/, "")}` : text;
        if (text) useCompanion.getState().dispatch({ type: "caption", caption: `“${tail}”`, source: "voice" });
      },
      onFinal: (text) => {
        gotFinal = true;
        set({ interim: "" });
        onFinal(text);
      },
      onError: (code) => {
        if (code !== "aborted") set({ error: ERRORS[code] ?? `Voice error: ${code}` });
      },
      onEnd: () => {
        stopMeter?.();
        stopMeter = null;
        stopRecognition = null;
        set({ listening: false });
        // If nothing was recognised, Pip stops listening; otherwise the agent takes over.
        if (!gotFinal && useCompanion.getState().state === "listening") dispatch("idle");
      },
    });
  },

  stop: () => {
    stopRecognition?.();
  },

  say: (text) => {
    if (usePrefs.getState().voiceMuted) return;
    get().hush();
    let lastBoundary = 0;
    let sawBoundary = false;
    const startedAt = performance.now();
    cancelSpeech = speak(text, {
      onStart: () => {
        set({ speaking: true });
        const s = useCompanion.getState().state;
        // Don't override a verdict state (success/error) the user should still see.
        if (s === "idle" || s === "speaking" || s === "presenting") dispatch("speaking");
        envelope = window.setInterval(() => {
          const now = performance.now();
          // Voices without boundary events fall back to Pip's built-in simulated envelope.
          if (!sawBoundary && now - startedAt > 600) return;
          const decay = Math.max(0, 1 - (now - lastBoundary) / 260);
          pip.setSpeechLevel(0.15 + 0.85 * decay * (0.75 + Math.random() * 0.25));
        }, 40);
      },
      onBoundary: () => {
        sawBoundary = true;
        lastBoundary = performance.now();
      },
      onEnd: () => {
        window.clearInterval(envelope);
        pip.setSpeechLevel(0);
        cancelSpeech = null;
        set({ speaking: false });
        if (useCompanion.getState().state === "speaking") dispatch("idle");
      },
    });
  },

  hush: () => {
    cancelSpeech?.();
    cancelSpeech = null;
  },
}));
