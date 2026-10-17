"use client";

import { Leva, folder, useControls } from "leva";
import { Copy, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  pip,
  pipRuntime,
  type Reaction,
  BASE_PARAMS,
  EYE_SHAPES,
  PIP_STATES,
  STATES,
  resolveParams,
  type EyeShape,
  type PipParams,
  type PipState,
} from "@/features/companion";
import { Button } from "@/components/ui/Button";
import { tokenDefinitions } from "@/tokens/definitions";
import { cn } from "@/lib/cn";
import { useCompanion } from "@/store/useCompanion";
import { PrimitivesShowcase } from "@/components/ui/PrimitivesShowcase";
import { RoamingPanel } from "./RoamingPanel";

type NumKey = Exclude<keyof PipParams, "rimR" | "rimG" | "rimB">;

/** Slider ranges for every tweakable param, grouped for the leva panel. */
const GROUPS: Record<string, Partial<Record<NumKey, [number, number, number]>>> = {
  Body: {
    noiseAmplitude: [0, 0.2, 0.001],
    noiseFrequency: [0.2, 4, 0.01],
    noiseSpeed: [0, 3, 0.01],
    squashY: [0.7, 1.3, 0.005],
    scale: [0.6, 1.4, 0.005],
    split: [0, 1, 0.01],
    coreIntensity: [0, 2, 0.01],
    rimIntensity: [0, 2, 0.01],
    saturation: [0, 1, 0.01],
  },
  Eyes: {
    eyeCapsule: [0, 1, 0.01],
    eyeNarrow: [0, 1, 0.01],
    eyeHappy: [0, 1, 0.01],
    eyeWide: [0, 1, 0.01],
    eyeCross: [0, 1, 0.01],
    eyeClosed: [0, 1, 0.01],
    eyeOpenness: [0, 1.3, 0.01],
    gazeX: [-1, 1, 0.01],
    gazeY: [-1, 1, 0.01],
    faceTilt: [-0.6, 0.6, 0.005],
  },
  Halo: {
    haloOpacity: [0, 1, 0.01],
    haloSpeed: [0, 8, 0.01],
    haloRadius: [1.1, 2, 0.005],
  },
  Pose: {
    leanX: [-0.6, 0.6, 0.005],
    leanY: [-0.8, 0.8, 0.005],
    leanZ: [-0.5, 0.5, 0.005],
    offsetX: [-0.5, 0.5, 0.005],
    offsetY: [-0.5, 0.5, 0.005],
  },
  Motion: {
    breathAmp: [0, 0.08, 0.001],
    breathRate: [0, 4, 0.01],
    swayAmp: [0, 0.4, 0.005],
    swayRate: [0, 5, 0.01],
    dartAmp: [0, 1, 0.01],
    alternateAmp: [0, 1, 0.01],
    pulseAmp: [0, 1, 0.01],
    pulseRate: [0, 6, 0.01],
    blink: [0, 1, 0.01],
    follow: [0, 1, 0.01],
    drift: [0, 1, 0.01],
    micReactive: [0, 1, 0.01],
    talk: [0, 1, 0.01],
  },
};

const NUM_KEYS = Object.values(GROUPS).flatMap((g) => Object.keys(g)) as NumKey[];

const EYE_KEYS: Record<EyeShape, NumKey> = {
  capsule: "eyeCapsule",
  narrow: "eyeNarrow",
  happy: "eyeHappy",
  wide: "eyeWide",
  cross: "eyeCross",
  closed: "eyeClosed",
};

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

function fromHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type LevaValues = Record<NumKey, number> & { rimColor: string; override: boolean };

function levaValuesFor(state: PipState): Partial<LevaValues> {
  const p = resolveParams(state);
  const out: Partial<LevaValues> = { rimColor: toHex(p.rimR, p.rimG, p.rimB) };
  for (const k of NUM_KEYS) out[k] = p[k];
  return out;
}

/** Serialises current slider values as a `params` block for states.ts (only fields that differ from BASE_PARAMS). */
function toStateSnippet(v: LevaValues): string {
  const eyes: Partial<Record<EyeShape, number>> = {};
  for (const shape of EYE_SHAPES) {
    const w = v[EYE_KEYS[shape]];
    if (w > 0.001) eyes[shape] = +w.toFixed(3);
  }
  const params: Record<string, unknown> = {};
  const eyeKeySet = new Set<NumKey>(Object.values(EYE_KEYS));
  for (const k of NUM_KEYS) {
    if (eyeKeySet.has(k)) continue;
    if (Math.abs(v[k] - BASE_PARAMS[k]) > 1e-4) params[k] = +v[k].toFixed(4);
  }
  return JSON.stringify({ color: v.rimColor, params: { eyes, ...params } }, null, 2);
}

export function PlaygroundClient() {
  const state = useCompanion((s) => s.state);
  const caption = useCompanion((s) => s.caption);
  const dispatch = useCompanion((s) => s.dispatch);
  const [cycling, setCycling] = useState(false);
  const [mic, setMic] = useState(0);
  const [autoMic, setAutoMic] = useState(false);
  const [autoSpeech, setAutoSpeech] = useState(false);
  const [copied, setCopied] = useState(false);

  const schema = useMemo(() => {
    const groups: Record<string, ReturnType<typeof folder>> = {};
    for (const [name, fields] of Object.entries(GROUPS)) {
      const entries: Record<string, { value: number; min: number; max: number; step: number }> = {};
      for (const [k, [min, max, step]] of Object.entries(fields) as [NumKey, [number, number, number]][]) {
        entries[k] = { value: resolveParams("idle")[k], min, max, step };
      }
      groups[name] = folder(entries, { collapsed: name !== "Eyes" && name !== "Body" });
    }
    return {
      override: { value: false, label: "override tween" },
      rimColor: { value: tokenDefinitions.colors.dark.accent, label: "rim colour" },
      ...groups,
    };
  }, []);

  const [values, set] = useControls(() => schema);
  const v = values as unknown as LevaValues;

  // Sliders follow the active state unless overriding (so you tune from the state's real values).
  useEffect(() => {
    if (!v.override) set(levaValuesFor(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on state change
  }, [state]);

  useEffect(() => {
    if (!v.override) {
      pipRuntime.override = null;
      return;
    }
    const [rimR, rimG, rimB] = fromHex(v.rimColor);
    const o: Partial<PipParams> = { rimR, rimG, rimB };
    for (const k of NUM_KEYS) o[k] = v[k];
    pipRuntime.override = o;
    pipRuntime.invalidate?.();
  }, [v]);

  useEffect(() => () => void (pipRuntime.override = null), []);

  const [activeTab, setActiveTab] = useState<"pip" | "primitives">("pip");

  // Deep links: /playground?state=thinking, /playground?cycle=1, /playground?tab=primitives
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const tab = sp.get("tab");
    if (tab === "primitives") setActiveTab("primitives");
    const s = sp.get("state");
    if (s && (PIP_STATES as readonly string[]).includes(s)) {
      window.setTimeout(() => dispatch({ type: "state_change", state: s as PipState, source: "dev" }), 300);
    }
    if (sp.get("cycle") === "1") setCycling(true);
  }, [dispatch]);

  // Cycle all states.
  useEffect(() => {
    if (!cycling) return;
    let i = PIP_STATES.indexOf(useCompanion.getState().state);
    const id = window.setInterval(() => {
      i = (i + 1) % PIP_STATES.length;
      dispatch({ type: "state_change", state: PIP_STATES[i], source: "dev" });
    }, 2600);
    return () => window.clearInterval(id);
  }, [cycling, dispatch]);

  // Simulated mic / speech envelopes.
  const micRef = useRef(mic);
  micRef.current = mic;
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = performance.now() / 1000;
      if (autoMic) pip.setMicLevel(Math.max(0, Math.sin(t * 6) * Math.sin(t * 1.7) + Math.random() * 0.25));
      else pip.setMicLevel(micRef.current);
      if (autoSpeech) pip.setSpeechLevel(Math.max(0, Math.sin(t * 13) * Math.sin(t * 2.3 + 1)) ** 1.2);
    }, 33);
    return () => {
      window.clearInterval(id);
      pip.setMicLevel(0);
    };
  }, [autoMic, autoSpeech]);

  const go = (s: PipState) => dispatch({ type: "state_change", state: s, source: "dev" });
  const react = (r: Reaction) => pip.react(r);

  async function copySnippet() {
    await navigator.clipboard.writeText(toStateSnippet(v));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("mx-auto max-w-page px-4 pt-8 sm:px-6", activeTab === "pip" ? "lg:pr-96" : "pb-16")}>
      <div className="mb-8 flex items-center gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("pip")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "pip" ? "bg-accent text-accent-text" : "text-muted hover:text-text bg-surface hairline",
          )}
        >
          Pip 3D Companion Bench
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("primitives")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "primitives" ? "bg-accent text-accent-text" : "text-muted hover:text-text bg-surface hairline",
          )}
        >
          UI Primitives Kit
        </button>
      </div>

      {activeTab === "primitives" ? (
        <PrimitivesShowcase />
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Pip playground</h1>
              <p className="font-mono text-xs text-muted">
                state: <span className="text-text">{state}</span>
              </p>
            </div>
            <p className="mt-1 text-sm text-muted">Click anywhere on the stage to make Pip glance there. Move the pointer to test gaze-follow (returns to drift after 4 s idle).</p>

            <div
              className="relative mt-6 grid aspect-square w-full max-w-xl cursor-crosshair place-items-center rounded-panel bg-surface hairline"
              onClick={(e) => pip.glanceAt(e.clientX, e.clientY, 1400)}
            >
              <div data-pip-anchor="stage" className="aspect-square w-4/5" aria-hidden />
            </div>

            <section aria-labelledby="states-h" className="mt-8">
              <div className="flex items-center justify-between">
                <h2 id="states-h" className="font-display text-sm font-semibold uppercase tracking-wider text-muted">
                  States
                </h2>
                <Button size="sm" variant={cycling ? "primary" : "secondary"} onClick={() => setCycling((c) => !c)}>
                  {cycling ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {cycling ? "Stop cycling" : "Cycle all states"}
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {PIP_STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => go(s)}
                    aria-pressed={state === s}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      state === s ? "bg-text text-bg" : "bg-surface hairline hover:bg-surface-2",
                    )}
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ background: STATES[s].color }} />
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-3 font-mono text-xs text-muted">caption: {caption ? `"${caption}"` : "(none)"}</p>
            </section>

            <RoamingPanel />
          </div>

          {/* Fixed, independently scrolling column: leva calls scrollIntoView on folder resize, which must not scroll the page. */}
          <aside className="mt-8 flex flex-col gap-6 pb-10 lg:fixed lg:bottom-4 lg:right-6 lg:top-20 lg:z-20 lg:mt-0 lg:w-90 lg:overflow-y-auto lg:pb-4">
            <section className="rounded-card bg-surface p-4 hairline">
              <h2 className="text-sm font-semibold">Reactions (do not change state)</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => react("hop")}>Hop</Button>
                <Button size="sm" variant="secondary" onClick={() => react("hop-spin")}>Hop + spin</Button>
                <Button size="sm" variant="secondary" onClick={() => react("shake")}>Shake</Button>
              </div>
            </section>

            <section className="rounded-card bg-surface p-4 hairline">
              <h2 className="text-sm font-semibold">Audio inputs (simulated)</h2>
              <label className="mt-3 flex items-center gap-3 text-sm">
                <span className="w-24 text-muted">Mic level</span>
                <input type="range" min={0} max={1} step={0.01} value={mic} onChange={(e) => setMic(+e.target.value)} className="flex-1 accent-[var(--accent)]" disabled={autoMic} />
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={autoMic} onChange={(e) => setAutoMic(e.target.checked)} className="accent-[var(--accent)]" />
                Auto mic envelope (try in <code className="font-mono text-xs">listening</code>)
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={autoSpeech} onChange={(e) => setAutoSpeech(e.target.checked)} className="accent-[var(--accent)]" />
                TTS envelope (try in <code className="font-mono text-xs">speaking</code>; off = built-in simulation)
              </label>
            </section>

            <section className="rounded-card bg-surface p-4 hairline">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Uniforms</h2>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => set(levaValuesFor(state))} aria-label="Reset sliders to the current state">
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={copySnippet}>
                    <Copy className="size-3.5" />
                    {copied ? "Copied" : "Copy config"}
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">
                Sliders track the active state. Turn on <em>override tween</em> to drive Pip directly, then copy the JSON into <code className="font-mono">states.ts</code>.
              </p>
              <div className="mt-3 overflow-hidden rounded-xl">
                <Leva fill flat titleBar={false} hideCopyButton />
              </div>
            </section>
          </aside>
        </>
      )}
    </div>
  );

}
