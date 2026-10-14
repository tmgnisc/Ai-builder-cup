"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { gsap } from "@/lib/motion";
import { startAnchorRegistry } from "@/lib/guide/anchors";
import { placeCenter } from "@/lib/guide/placement";
import { openPipPrompt } from "@/components/bubble/BubbleLayer";
import { useBubble } from "@/store/useBubble";
import { useCompanion } from "@/store/useCompanion";
import { findAnchor, usePipPosition } from "@/store/usePipPosition";
import * as pilot from "./pilot";
import { pip, pipRuntime } from "./runtime";
import { STATES } from "./states";
import { usePointerGaze } from "./usePointerGaze";

const PipCanvas = dynamic(() => import("./PipCanvas"), { ssr: false, loading: () => <PipStandIn /> });

const DRAG_THRESHOLD = 6;

/**
 * Fixed companion layer, mounted once in the root layout so Pip persists across routes.
 *
 * Pip roams the whole screen. Its live position comes from `pilot.ts` every frame; one small
 * WebGL canvas (sized for Pip's largest size) is moved and scaled with a CSS transform, which
 * is far cheaper than a full-viewport canvas. The layer never catches pointer events: only the
 * round hit area over Pip's body does (click to talk, drag to move, double-click to park).
 */
export function CompanionLayer() {
  const pathname = usePathname();
  const state = useCompanion((s) => s.state);
  const caption = useCompanion((s) => s.caption);
  const dispatch = useCompanion((s) => s.dispatch);
  const bubbleOpen = useBubble((s) => s.content !== null);
  const mode = usePipPosition((s) => s.mode);

  const wrapRef = useRef<HTMLDivElement>(null);
  const glitchRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ x: number; y: number; dragging: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);

  const [canvasReady, setCanvasReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [base, setBase] = useState(436);

  usePointerGaze();
  useEffect(() => startAnchorRegistry(), []);
  // Dev-only handle for the playground and browser tests.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    void Promise.all([import("@/lib/guide/anchors"), import("@/components/guide/Spotlight"), import("@/lib/guide/placement"), import("@/store/useGuide")]).then(([anchors, spot, placement, guide]) => {
      (window as unknown as { __pip: unknown }).__pip = { position: usePipPosition, spotlight: spot.useSpotlight, anchors, placement, pilot, guide: guide.useGuide };
    });
  }, []);

  // Defer WebGL (three.js + shader compile) until the page has loaded and the main thread
  // is idle, so it never competes with first paint or hydration. The CSS stand-in shows
  // until then.
  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const cic = window.cancelIdleCallback ?? window.clearTimeout;
    let idle = 0;
    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => (idle = ric(() => setCanvasReady(true), { timeout: 2000 })), 600);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(timer);
      if (idle) cic(idle);
    };
  }, []);

  useEffect(() => {
    pipRuntime.glitchEl = glitchRef.current;
    return () => {
      pipRuntime.glitchEl = null;
    };
  }, []);

  // A drawer slid in over a resting Pip: step aside to its edge rather than sit on top of
  // it. (When Pip is anchored to something inside the drawer, it stays put.)
  useEffect(() => {
    let timer = 0;
    const check = () => {
      if (pilot.isMobile()) return;
      const mode = pilot.getMode();
      if (mode !== "free" && mode !== "parked") return;
      const { x, y, size } = pilot.getLive();
      const r = size / 2;
      for (const el of document.querySelectorAll("[data-sheet-open='true']")) {
        const b = el.getBoundingClientRect();
        if (x + r < b.left || x - r > b.right || y + r < b.top || y - r > b.bottom) continue;
        const target = b.left > window.innerWidth / 2 ? { x: b.left - pilot.MARGIN - r, y } : b.right < window.innerWidth / 2 ? { x: b.right + pilot.MARGIN + r, y } : { x, y: b.top - pilot.MARGIN - r };
        void usePipPosition.getState().flyToPoint(target, { mode });
        return;
      }
    };
    const mo = new MutationObserver((records) => {
      if (!records.some((m) => (m.target as Element).getAttribute("data-sheet-open") === "true")) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(check, 520); // after the slide-in
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-sheet-open"] });
    return () => {
      mo.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // Canvas box = Pip's largest size on this device; smaller sizes are a CSS scale.
  useEffect(() => {
    const update = () => {
      setBase(Math.ceil(pilot.sizeFor("hero") / pilot.ORB_FRACTION));
      pilot.onResize();
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Render loop: live position → transform. Runs on GSAP's ticker (paused with the tab).
  useEffect(() => {
    const wrap = wrapRef.current;
    const cap = captionRef.current;
    if (!wrap || !cap) return;
    const tick = () => {
      const p = pilot.frame(performance.now());
      const box = p.size / pilot.ORB_FRACTION;
      const scale = box / base;
      wrap.style.transform = `translate3d(${p.x - box / 2}px, ${p.y - box / 2}px, 0) scale(${scale})`;
      cap.style.transform = `translate3d(${p.x}px, ${p.y + p.size * 0.62}px, 0) translateX(-50%)`;
      cap.dataset.compact = String(p.size < 90);
      pipRuntime.center.x = p.x;
      pipRuntime.center.y = p.y;
      pipRuntime.displaySize = box;
      pipRuntime.renderScale = scale;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [base]);

  // Where Pip goes when a page loads.
  useEffect(() => {
    const pos = usePipPosition.getState();
    const id = window.requestAnimationFrame(() => {
      const stage = findAnchor("stage");
      if (stage) return void pos.flyToAnchor(stage, { size: Math.round(stage.getBoundingClientRect().width * pilot.ORB_FRACTION), place: placeCenter });
      const hero = findAnchor("hero");
      if (hero && hero.getBoundingClientRect().width > 0 && window.scrollY < 200) {
        return void pos.flyToAnchor(hero, { size: "hero", place: placeCenter });
      }
      if (pilot.getMode() !== "parked") void pos.goHome();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  // An anchor scrolled away: the hero hands Pip back home; others release Pip near the nearest side.
  useEffect(() => {
    pilot.setAnchorLostHandler((last) => {
      const pos = usePipPosition.getState();
      if (pos.anchorId === "hero") return void pos.goHome();
      const size = pilot.sizeFor("free");
      const side = last.x < window.innerWidth / 2 ? pilot.MARGIN + size / 2 : window.innerWidth - pilot.MARGIN - size / 2;
      void pos.flyToPoint({ x: side, y: last.y }, { size });
    });
    return () => pilot.setAnchorLostHandler(null);
  }, []);

  // Back at the top of the landing page: Pip returns to the hero.
  useEffect(() => {
    if (pathname !== "/") return;
    let t: number | undefined;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const hero = findAnchor("hero");
        if (window.scrollY < 80 && hero && pilot.getMode() === "free") {
          void usePipPosition.getState().flyToAnchor(hero, { size: "hero", place: placeCenter });
        }
      }, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(t);
    };
  }, [pathname]);

  // Greet once per page load when the session starts on the landing page.
  const greeted = useRef(false);
  useEffect(() => {
    if (!canvasReady || greeted.current || pathname !== "/") return;
    greeted.current = true;
    const id = window.setTimeout(() => dispatch({ type: "state_change", state: "greeting", source: "session" }), 900);
    return () => window.clearTimeout(id);
  }, [canvasReady, pathname, dispatch]);

  // ── Pointer: click to talk, drag to move, double-click to park ──
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    press.current = { x: e.clientX, y: e.clientY, dragging: false, id: e.pointerId };
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_THRESHOLD) {
      p.dragging = true;
      hitRef.current?.setPointerCapture(e.pointerId);
      pilot.beginDrag({ x: p.x, y: p.y });
    }
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const p = press.current;
    press.current = null;
    if (p?.dragging) {
      hitRef.current?.releasePointerCapture(e.pointerId);
      pilot.endDrag();
      suppressClick.current = true;
    }
  }

  const color = STATES[state].color;

  return (
    <>
      <div
        ref={wrapRef}
        className="pointer-events-none fixed left-0 top-0 z-[55] origin-top-left will-change-transform"
        style={{ ["--pip-color" as string]: color, width: base, height: base, transform: "translate3d(-999px,-999px,0)" }}
      >
        <div
          aria-hidden
          className="absolute inset-[18%] rounded-full opacity-45 blur-2xl transition-[background] duration-500"
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
          ref={hitRef}
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            pip.react("hop-spin");
            // Clicking Pip always means "I want to talk": only an open prompt toggles closed.
            const b = useBubble.getState();
            if (b.content?.kind === "prompt") b.close("user");
            else if (b.content?.kind === "agent") {
              b.setInputOpen(true);
              window.setTimeout(() => document.getElementById("pip-input")?.focus(), 60);
            } else openPipPrompt(pathname);
          }}
          onDoubleClick={() => {
            useBubble.getState().close("user");
            void usePipPosition.getState().park();
          }}
          aria-label="Talk to Pip"
          aria-expanded={bubbleOpen}
          title="Click to talk · drag to move · double-click to park"
          className="pointer-events-auto absolute touch-none rounded-full focus-visible:outline-offset-0"
          style={{
            left: `${(1 - pilot.ORB_FRACTION) * 50}%`,
            top: `${(1 - pilot.ORB_FRACTION) * 50}%`,
            width: `${pilot.ORB_FRACTION * 100}%`,
            height: `${pilot.ORB_FRACTION * 100}%`,
            cursor: mode === "dragging" ? "grabbing" : "grab",
          }}
        />
      </div>

      <div
        ref={captionRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[55] transition-opacity duration-300 data-[compact=true]:hidden"
        style={{ opacity: caption && !bubbleOpen ? 1 : 0, transform: "translate3d(-999px,-999px,0)" }}
      >
        <div className="glass flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium">
          <span className="size-1.5 rounded-full shadow-[0_0_8px_var(--pip-color)]" style={{ background: color, ["--pip-color" as string]: color }} />
          <ScrambleText text={caption || " "} instant={caption.startsWith("“")} />
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
