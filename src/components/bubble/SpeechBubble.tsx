"use client";

import { ArrowUp, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/chat/Markdown";
import { MicButton } from "@/components/chat/MicButton";
import { CartActionCard } from "@/components/chat/blocks/CartActionCard";
import * as pilot from "@/components/companion/pilot";
import { STATES } from "@/components/companion/states";
import { cn } from "@/lib/cn";
import { gsap, motion, useReducedMotion } from "@/lib/motion";
import { useBubble, type BubbleChip, type BubbleContent } from "@/store/useBubble";
import { useChat, type ChatMessage } from "@/store/useChat";
import { useCompanion } from "@/store/useCompanion";
import { useCompare } from "@/store/useCompare";
import { useVoice } from "@/store/useVoice";
import { Chips, MiniCards, TraceLine } from "./BubbleParts";
import { PipMenu } from "./PipMenu";

type Side = "right" | "left" | "top" | "bottom";

const GAP = 14;
const EDGE = 12;
const HEADER = pilot.HEADER_H;

/** Reading time: ≈250 ms per word, clamped to 4–12 s. */
export function readingTimeMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(12_000, Math.max(4_000, words * 250));
}

/**
 * Pip's speech bubble: the only place Pip talks. Attached to Pip with a tail, it sits on the
 * side with the most free space (with hysteresis) and follows Pip every frame. One bubble at a
 * time: new content cross-fades in; closing shrinks it back into Pip.
 */
export function SpeechBubble() {
  const content = useBubble((s) => s.content);
  const key = useBubble((s) => s.key);
  const close = useBubble((s) => s.close);
  const pipState = useCompanion((s) => s.state);
  const reduced = useReducedMotion();

  // Keep the last content rendered while the exit animation plays.
  const [rendered, setRendered] = useState<{ content: BubbleContent; key: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLSpanElement>(null);
  const sideRef = useRef<Side | null>(null);

  useEffect(() => {
    if (content) setRendered({ content, key });
  }, [content, key]);

  // Follow Pip every frame.
  useEffect(() => {
    if (!rendered) return;
    const tick = () => position(rootRef.current, panelRef.current, tailRef.current, sideRef);
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [rendered]);

  // Enter / replace / exit.
  const shownKey = useRef<number | null>(null);
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (content && rendered) {
      const fresh = shownKey.current === null;
      shownKey.current = key;
      if (reduced) return void gsap.set(el, { opacity: 1, scale: 1 });
      if (fresh) gsap.fromTo(el, { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 0.55, ease: "back.out(1.6)" });
      else gsap.fromTo(el, { opacity: 0.35, y: 4 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    } else if (!content && rendered) {
      shownKey.current = null;
      gsap.to(el, { opacity: 0, scale: 0.4, duration: reduced ? 0 : 0.28, ease: "power2.in", onComplete: () => setRendered(null) });
    }
  }, [content, key, rendered, reduced]);

  if (!rendered) return null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed left-0 top-0 z-[56] will-change-transform"
      style={{ transform: "translate3d(-999px,-999px,0)", ["--pip-color" as string]: STATES[pipState].color }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Pip"
        onKeyDown={(e) => e.key === "Escape" && close("user")}
        className="bubble-panel glass pointer-events-auto relative w-[min(340px,calc(100vw-24px))] rounded-[20px] p-3.5 pr-3"
      >
        <span ref={tailRef} aria-hidden className="bubble-tail absolute size-3.5 rotate-45 rounded-[3px]" />
        <BubbleBody content={rendered.content} contentKey={rendered.key} />
      </div>
    </div>
  );
}

function position(root: HTMLDivElement | null, panel: HTMLDivElement | null, tail: HTMLSpanElement | null, sideRef: { current: Side | null }) {
  if (!root || !panel || !tail) return;
  const { x: px, y: py, size } = pilot.getLive();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const W = panel.offsetWidth;
  const H = panel.offsetHeight;
  const r = size / 2;
  const mobile = vw < 768;

  let x: number;
  let y: number;
  let side: Side;

  if (mobile) {
    // Bottom card, tail pointing up (Pip sits above it) or down.
    x = (vw - W) / 2;
    const above = py + r + GAP + H <= vh - EDGE;
    side = above ? "bottom" : "top";
    y = above ? py + r + GAP : Math.max(HEADER + EDGE, Math.min(vh - H - EDGE, py - r - GAP - H));
    if (!above && py - r - GAP - H < HEADER + EDGE) y = vh - H - EDGE;
  } else {
    const fits: Record<Side, boolean> = {
      right: px + r + GAP + W <= vw - EDGE,
      left: px - r - GAP - W >= EDGE,
      top: py - r - GAP - H >= HEADER + EDGE,
      bottom: py + r + GAP + H <= vh - EDGE,
    };
    const space: Record<Side, number> = { right: vw - px - r, left: px - r, top: (py - r - HEADER) * 1.6, bottom: (vh - py - r) * 1.6 };
    const prev = sideRef.current;
    side = prev && fits[prev] ? prev : ((["right", "left", "top", "bottom"] as Side[]).filter((s) => fits[s]).sort((a, b) => space[b] - space[a])[0] ?? "top");
    const clampY = (v: number) => Math.max(HEADER + EDGE, Math.min(vh - H - EDGE, v));
    const clampX = (v: number) => Math.max(EDGE, Math.min(vw - W - EDGE, v));
    if (side === "right") [x, y] = [px + r + GAP, clampY(py - Math.min(H * 0.35, 60))];
    else if (side === "left") [x, y] = [px - r - GAP - W, clampY(py - Math.min(H * 0.35, 60))];
    else if (side === "top") [x, y] = [clampX(px - W / 2), Math.max(HEADER + EDGE, py - r - GAP - H)];
    else [x, y] = [clampX(px - W / 2), py + r + GAP];
  }
  sideRef.current = side;
  root.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

  // Tail on the edge facing Pip.
  const t = tail.style;
  t.left = t.right = t.top = t.bottom = "";
  if (side === "right" || side === "left") {
    t.top = `${Math.max(16, Math.min(H - 30, py - y - 7))}px`;
    t[side === "right" ? "left" : "right"] = "-6px";
  } else {
    t.left = `${Math.max(16, Math.min(W - 30, px - x - 7))}px`;
    t[side === "bottom" ? "top" : "bottom"] = "-6px";
  }
  panel.style.transformOrigin = side === "right" ? "0% 30%" : side === "left" ? "100% 30%" : side === "bottom" ? `${px - x}px 0%` : `${px - x}px 100%`;
}

// ───────────────────────── Body ─────────────────────────

function BubbleBody({ content, contentKey }: { content: BubbleContent; contentKey: number }) {
  const close = useBubble((s) => s.close);
  const inputOpen = useBubble((s) => s.inputOpen);
  const setInputOpen = useBubble((s) => s.setInputOpen);
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const send = useChat((s) => s.send);
  const state = useCompanion((s) => s.state);
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // pointerleave doesn't fire when content under a still cursor is replaced, so verify on any move.
  useEffect(() => {
    if (!hover) return;
    const onMove = (e: PointerEvent) => {
      const panel = bodyRef.current?.parentElement;
      if (panel && !panel.contains(e.target as Node)) setHover(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [hover]);

  const message = content.kind === "agent" ? messages.find((m) => m.id === content.messageId) : undefined;
  const userLine = useMemo(() => {
    if (!message) return null;
    const i = messages.indexOf(message);
    for (let j = i - 1; j >= 0; j--) if (messages[j].role === "user") return messages[j].text;
    return null;
  }, [message, messages]);

  const pick = (c: BubbleChip) => {
    if (c.run) c.run();
    if (c.message) void send(c.message);
    if (!c.message && !c.run) close("user");
  };

  // What's on screen decides whether the bubble may time out.
  const view = describe(content, message);
  const actionable = view.hasActions || hover || focused || menuOpen || draft.length > 0;
  const settled = content.kind === "tip" || (message !== undefined && message.status !== "streaming");
  const timeoutMs = settled && !actionable ? readingTimeMs(view.text) : null;

  return (
    <div
      ref={bodyRef}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      data-hover={hover}
      data-focused={focused}
      data-actions={view.hasActions}
      data-settled={settled}
    >
      <div className="absolute right-2 top-2 flex items-center gap-0.5">
        <PipMenu onOpenChange={setMenuOpen} />
        <button type="button" onClick={() => close("user")} aria-label="Dismiss" className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="pr-14" aria-live="polite">
        {userLine && <p className="mb-1 truncate text-[11px] text-muted">You: {userLine}</p>}
        {content.kind === "prompt" && <p className="text-[14px] leading-relaxed">What can I help with? Ask me anything about this page, or try:</p>}
        {content.kind === "tip" && <TypedText key={contentKey} text={content.text} />}
        {message && <AgentText message={message} />}
      </div>

      {content.kind === "tip" && content.productIds?.length ? <MiniCards productIds={content.productIds} interactive={!busy} /> : null}
      {content.kind === "tip" && content.chips?.length ? <Chips chips={content.chips} onPick={pick} /> : null}
      {content.kind === "prompt" && <Chips chips={content.suggestions.map((s) => ({ label: s, message: s }))} onPick={pick} />}
      {message && <AgentBlocks message={message} busy={busy} onPick={pick} />}
      {message && <TraceLine trace={message.trace} />}

      {inputOpen || content.kind !== "tip" ? (
        <ReplyInput draft={draft} setDraft={setDraft} autoFocus={content.kind === "prompt"} busy={busy} />
      ) : (
        <button type="button" onClick={() => setInputOpen(true)} className="mt-2 text-[11px] text-muted underline-offset-2 hover:text-text hover:underline">
          Reply to Pip
        </button>
      )}

      {timeoutMs !== null && <TimeoutLine key={`${contentKey}-${message?.status ?? ""}`} ms={timeoutMs} color={STATES[state].color} onDone={() => close("timeout")} />}
    </div>
  );
}

function describe(content: BubbleContent, message: ChatMessage | undefined): { text: string; hasActions: boolean } {
  if (content.kind === "prompt") return { text: "", hasActions: true };
  if (content.kind === "tip") return { text: content.text, hasActions: !!content.chips?.length || !!content.productIds?.length };
  if (!message) return { text: "", hasActions: false };
  const hasActions = message.blocks.some(
    (b) => b.kind === "clarify" || b.kind === "product_carousel" || (b.kind === "cart_action" && b.status === "pending"),
  );
  return { text: message.text, hasActions };
}

function AgentText({ message }: { message: ChatMessage }) {
  const streaming = message.status === "streaming";
  if (!message.text && streaming) {
    return (
      <p className="flex h-6 items-center gap-1" aria-label="Pip is working">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted motion-reduce:animate-none" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </p>
    );
  }
  return (
    <div className={cn("text-[14px] leading-relaxed", message.status === "error" && "text-danger")}>
      <Markdown text={message.text} />
      {streaming && <span aria-hidden className="caret text-accent-text" />}
    </div>
  );
}

function AgentBlocks({ message, busy, onPick }: { message: ChatMessage; busy: boolean; onPick: (c: BubbleChip) => void }) {
  const show = useCompare((s) => s.show);
  const streaming = message.status === "streaming";
  return (
    <>
      {message.blocks.map((b) => {
        switch (b.kind) {
          case "product_carousel":
            return <MiniCards key={b.id} productIds={b.productIds} interactive={!busy} />;
          case "cart_action":
            return <CartActionCard key={b.id} {...b} />;
          case "comparison":
            return (
              <Chips key={b.id} chips={[{ label: "Open the comparison", run: () => show(b.productIds, { context: b.context, priorities: b.priorities }) }]} onPick={onPick} />
            );
          case "clarify":
            return streaming ? null : <Chips key={b.id} chips={b.options.map((o, i) => ({ label: o, message: o, primary: i === 0 }))} onPick={onPick} />;
        }
      })}
    </>
  );
}

/** Tips "type in" like streamed text. */
function TypedText({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setN((v) => (v >= text.length ? (window.clearInterval(id), v) : v + 2)), 16);
    return () => window.clearInterval(id);
  }, [text, reduced]);
  return (
    <p className="text-[14px] leading-relaxed">
      <Markdown text={text.slice(0, n)} />
      <span className="sr-only">{text.replace(/\*\*/g, "")}</span>
    </p>
  );
}

function ReplyInput({ draft, setDraft, autoFocus, busy }: { draft: string; setDraft: (v: string) => void; autoFocus: boolean; busy: boolean }) {
  const send = useChat((s) => s.send);
  const stop = useChat((s) => s.stop);
  const listening = useVoice((s) => s.listening);
  const interim = useVoice((s) => s.interim);
  const voiceError = useVoice((s) => s.error);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 80);
  }, [autoFocus]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft.trim()) return;
    void send(draft);
    setDraft("");
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <div className="flex items-center gap-1 rounded-full bg-surface/80 p-1 pl-3 hairline focus-within:shadow-[inset_0_0_0_1px_var(--accent-text)]">
        <label htmlFor="pip-input" className="sr-only">
          Reply to Pip
        </label>
        <input
          id="pip-input"
          ref={ref}
          value={listening ? interim : draft}
          readOnly={listening}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={listening ? "Listening…" : "Reply, or hold V to talk"}
          maxLength={500}
          autoComplete="off"
          className="h-8 min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-muted focus:outline-none"
        />
        <MicButton size={32} />
        {busy ? (
          <button type="button" onClick={stop} aria-label="Stop" className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 hover:bg-danger/20">
            <Square className="size-3 fill-current" />
          </button>
        ) : (
          <button type="submit" disabled={!draft.trim()} aria-label="Send" className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-fg disabled:opacity-40">
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
      {voiceError && (
        <p role="alert" className="mt-1.5 px-1 text-[11px] text-danger">
          {voiceError}
        </p>
      )}
    </form>
  );
}

/** Thin line showing the time left before the bubble dismisses itself. */
function TimeoutLine({ ms, color, onDone }: { ms: number; color: string; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tween = gsap.fromTo(el, { scaleX: 1 }, { scaleX: 0, duration: ms / 1000, ease: "none", onComplete: () => done.current() });
    if (motion.reduced) gsap.set(el, { opacity: 0 });
    return () => {
      tween.kill();
    };
  }, [ms]);
  return <span ref={ref} aria-hidden className="absolute inset-x-4 bottom-1 h-px origin-left rounded-full opacity-70" style={{ background: color }} />;
}
