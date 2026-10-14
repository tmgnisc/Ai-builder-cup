"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { gsap, motion, ScrollTrigger, useGSAP } from "@/lib/motion";
import { useChat } from "@/store/useChat";
import { useCompanion } from "@/store/useCompanion";
import { pip, pipRuntime } from "./runtime";
import { STATES } from "./states";
import { usePointerGaze } from "./usePointerGaze";

const PipCanvas = dynamic(() => import("./PipCanvas"), { ssr: false, loading: () => <PipStandIn /> });

type Mode = "dock" | "hero" | "stage";

/** Fraction of the canvas box that Pip's body occupies; the hit area matches it. */
const HIT = 0.56;

/**
 * Fixed companion layer, mounted once in the root layout so Pip persists across routes.
 *
 * One WebGL canvas, never re-parented. Its box is computed every frame from anchors:
 *   - `[data-pip-anchor="dock"]`  fixed bottom-right (72px orb on mobile, 180px on desktop)
 *   - `[data-pip-anchor="hero"]`  on "/": scroll-scrubbed flight from the hero into the dock
 *   - `[data-pip-anchor="stage"]` on /playground: Pip stays on stage
 * The canvas renders at the largest size it will be shown at and is scaled with a
 * transform; the scene lowers DPR when shrunk so no pixels are wasted.
 *
 * The layer never catches pointer events. Only the circular hit area over Pip does.
 */
export function CompanionLayer() {
  const pathname = usePathname();
  const state = useCompanion((s) => s.state);
  const caption = useCompanion((s) => s.caption);
  const dispatch = useCompanion((s) => s.dispatch);
  const chatOpen = useChat((s) => s.open);
  const toggleChat = useChat((s) => s.toggle);

  const wrapRef = useRef<HTMLDivElement>(null);
  const glitchRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const progress = useRef<{ p: number } | null>(null);

  const [canvasReady, setCanvasReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [viewportKey, setViewportKey] = useState(0);

  usePointerGaze();

  // Defer WebGL until the main thread is idle so it never competes with first paint.
  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const cic = window.cancelIdleCallback ?? window.clearTimeout;
    const id = ric(() => setCanvasReady(true), { timeout: 1500 });
    return () => cic(id);
  }, []);

  // Re-resolve anchors when the viewport crosses breakpoints or resizes.
  useEffect(() => {
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setViewportKey((k) => k + 1), 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    pipRuntime.glitchEl = glitchRef.current;
    return () => {
      pipRuntime.glitchEl = null;
    };
  }, []);

  // Greet once per page load when the session starts on the landing page.
  const greeted = useRef(false);
  useEffect(() => {
    if (!canvasReady || greeted.current || pathname !== "/") return;
    greeted.current = true;
    const id = window.setTimeout(() => dispatch({ type: "state_change", state: "greeting", source: "session" }), 700);
    return () => window.clearTimeout(id);
  }, [canvasReady, pathname, dispatch]);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const cap = captionRef.current;
      const dock = dockRef.current;
      if (!wrap || !cap || !dock) return;

      const anchor = document.querySelector<HTMLElement>('[data-pip-anchor="hero"], [data-pip-anchor="stage"]');
      const anchorVisible = !!anchor && anchor.offsetWidth > 0 && anchor.getClientRects().length > 0;
      // While chatting, Pip always sits in the dock next to the panel.
      const mode: Mode = anchorVisible && !chatOpen ? (anchor.dataset.pipAnchor as Mode) : "dock";

      // Measure once per setup; the layout pass uses scroll offsets, not live rects (no forced reflow).
      const d = dock.getBoundingClientRect();
      const dockBox = { x: d.left, y: d.top, size: d.width };
      const a = anchorVisible ? anchor.getBoundingClientRect() : null;
      const anchorDoc = a ? { x: a.left + window.scrollX, y: a.top + window.scrollY, size: a.width } : null;
      const base = Math.max(dockBox.size, anchorDoc?.size ?? 0);
      wrap.style.width = wrap.style.height = `${base}px`;

      const first = progress.current === null;
      const prog = (progress.current ??= { p: mode === "dock" ? 1 : 0 });
      const easeX = gsap.parseEase("power2.in");
      const easeY = gsap.parseEase("power2.out");

      const layout = () => {
        let { x, y, size } = dockBox;
        if (anchorDoc && prog.p < 1) {
          const ax = anchorDoc.x - window.scrollX;
          const ay = anchorDoc.y - window.scrollY;
          const p = prog.p;
          // Different easings per axis give the flight a gentle arc.
          x = ax + (dockBox.x - ax) * easeX(p);
          y = ay + (dockBox.y - ay) * easeY(p);
          size = anchorDoc.size + (dockBox.size - anchorDoc.size) * p;
        }
        const scale = size / base;
        wrap.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
        cap.style.transform = `translate3d(${x + size / 2}px, ${y + size * 0.88}px, 0) translateX(-50%)`;
        cap.dataset.compact = String(size < 150);
        pipRuntime.center.x = x + size / 2;
        pipRuntime.center.y = y + size / 2;
        pipRuntime.displaySize = size;
        pipRuntime.renderScale = scale;
        pipRuntime.invalidate?.();
      };

      const target = mode === "dock" ? 1 : 0;
      if (mode === "hero") {
        const section = anchor?.closest("section") ?? anchor;
        const setP = motion.reduced
          ? (v: number) => {
              prog.p = v;
            }
          : gsap.quickTo(prog, "p", { duration: 0.7, ease: "expo.out" });
        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom 35%",
          onUpdate: (self) => setP(self.progress),
          onRefresh: (self) => setP(self.progress),
        });
      } else if (first || motion.reduced) {
        prog.p = target;
      } else {
        gsap.to(prog, { p: target, duration: 0.9, ease: "expo.out" });
      }

      layout();
      if (mode === "dock") {
        // Docked: only needs re-layout while a dock-return tween runs.
        const tick = () => {
          layout();
          if (prog.p >= 1) gsap.ticker.remove(tick);
        };
        if (prog.p < 1) gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
      }
      gsap.ticker.add(layout);
      return () => gsap.ticker.remove(layout);
    },
    { dependencies: [pathname, viewportKey, chatOpen], revertOnUpdate: true },
  );

  const color = STATES[state].color;

  return (
    <>
      <div data-pip-anchor="dock" ref={dockRef} aria-hidden className="pointer-events-none fixed bottom-1 right-1 size-[132px] md:bottom-6 md:right-6 md:size-[180px]" />

      <div
        ref={wrapRef}
        className="pointer-events-none fixed left-0 top-0 z-30 origin-top-left will-change-transform"
        style={{ ["--pip-color" as string]: color, width: 180, height: 180, transform: "translate3d(-999px,-999px,0)" }}
      >
        <div
          aria-hidden
          className="absolute inset-[14%] rounded-full opacity-45 blur-2xl transition-[background] duration-500"
          style={{ background: "radial-gradient(circle, var(--pip-color) 0%, transparent 62%)" }}
        />
        <div ref={glitchRef} role="img" aria-label={`Pip, ${state}`} className="absolute inset-0">
          {canvasReady && !webglFailed ? (
            <WebGLBoundary onError={() => setWebglFailed(true)}>
              <PipCanvas />
            </WebGLBoundary>
          ) : (
            <PipStandIn />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            pip.react("hop-spin");
            toggleChat();
          }}
          aria-label={chatOpen ? "Close chat with Pip" : "Talk to Pip"}
          aria-expanded={chatOpen}
          className="pointer-events-auto absolute rounded-full focus-visible:outline-offset-0"
          style={{ left: `${(1 - HIT) * 50}%`, top: `${(1 - HIT) * 50}%`, width: `${HIT * 100}%`, height: `${HIT * 100}%` }}
        />
      </div>

      <div
        ref={captionRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 transition-opacity duration-300 data-[compact=true]:hidden"
        style={{ opacity: caption ? 1 : 0, transform: "translate3d(-999px,-999px,0)" }}
      >
        <div className="glass flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium">
          <span className="size-1.5 rounded-full shadow-[0_0_8px_var(--pip-color)]" style={{ background: color, ["--pip-color" as string]: color }} />
          <ScrambleText text={caption || " "} />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {caption}
      </p>
    </>
  );
}

class WebGLBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? <PipStandIn /> : this.props.children;
  }
}

/** CSS fallback before WebGL loads or when it is unavailable. */
function PipStandIn() {
  return (
    <span className="absolute inset-0 grid place-items-center">
      <span
        aria-hidden
        className="relative grid size-[52%] place-items-center rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--pip-color, #c6ff3d), black 70%) 0%, #05060a 75%)",
          boxShadow: "inset 0 0 0 1.5px color-mix(in oklab, var(--pip-color, #c6ff3d), transparent 40%), 0 0 40px -10px var(--pip-color, #c6ff3d)",
        }}
      >
        <span className="flex -translate-y-[6%] gap-[18%]" style={{ width: "40%", justifyContent: "center" }}>
          <span className="aspect-[1/1.8] w-[24%] rounded-full bg-white" />
          <span className="aspect-[1/1.8] w-[24%] rounded-full bg-white" />
        </span>
      </span>
    </span>
  );
}
