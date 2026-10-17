"use client";

import { gsap, motion } from "@/lib/motion";
import { pip, pipRuntime } from "./runtime";

/**
 * Pip's flight controller. Owns the *live* position (screen px, orb centre) and decides it
 * every frame from the current mode. Moving is a reaction: nothing here touches Pip's agent state.
 *
 *   free      rests at a spot with a slow Lissajous wander (±20px)
 *   anchored  tracks a DOM element (follows scroll); `placeFn` picks the spot beside it
 *   follow    trails the cursor at a distance, never on top of it
 *   parked    sits in a corner, still
 *   dragging  follows the pointer while the user drags
 */

export type PipMode = "free" | "anchored" | "follow" | "parked" | "dragging";
export type Corner = "tl" | "tr" | "bl" | "br";

export interface Point {
  x: number;
  y: number;
}

/** Orb diameter as a fraction of the canvas box (the rest is room for halo and squash). */
export const ORB_FRACTION = 0.55;
export const MARGIN = 16;
export const HEADER_H = 64;

/** Orb diameter (px) by context. */
export const SIZES = {
  desktop: { hero: 240, presenting: 160, free: 120, anchored: 84, parked: 64 },
  mobile: { hero: 96, presenting: 64, free: 64, anchored: 64, parked: 64 },
} as const;
export type SizeKey = keyof (typeof SIZES)["desktop"];

export function isMobile(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}
export function sizeFor(key: SizeKey): number {
  return SIZES[isMobile() ? "mobile" : "desktop"][key];
}

/** Resolves where Pip should sit for an anchored element (replaced by smart placement). */
export type PlaceFn = (anchor: Element, size: number) => Point | null;

interface Live {
  x: number;
  y: number;
  size: number;
}

const live: Live = { x: -500, y: -500, size: 120 };
const rest: Point = { x: -500, y: -500 };
const state = {
  mode: "free" as PipMode,
  anchorEl: null as Element | null,
  place: null as PlaceFn | null,
  flying: false,
  wander: 0,
  grab: { x: 0, y: 0 },
  vx: 0,
  vy: 0,
  lastT: 0,
  initialized: false,
  /** Size Pip is heading to; placement uses it (not the mid-flight size) so it picks the right side. */
  targetSize: 120,
  /** When the anchor first went missing (anchors are released after a grace period). */
  lostSince: 0,
};
const ANCHOR_GRACE_MS = 600;
let flight: gsap.core.Tween | null = null;
let sizeTween: gsap.core.Tween | null = null;
let onAnchorLost: ((last: Point) => void) | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function onPilotChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Called when an anchored element scrolls out of view or disappears. */
export function setAnchorLostHandler(fn: ((last: Point) => void) | null) {
  onAnchorLost = fn;
}

export function getLive(): Readonly<Live> {
  return live;
}
export function getMode(): PipMode {
  return state.mode;
}
export function isFlying(): boolean {
  return state.flying;
}

let avoidBottom = 0;
/** Mobile: keep Pip above a bottom-anchored bubble of this height (0 = none). */
export function setAvoidBottom(px: number) {
  avoidBottom = px;
}

/**
 * Keeps the orb fully on screen (and below the header). On mobile Pip only lives on the
 * left/right edges, never over the middle of the content.
 */
export function clampToViewport(p: Point, size: number): Point {
  const r = size / 2;
  let top = HEADER_H + MARGIN + r * 0.6;
  let x = Math.min(window.innerWidth - MARGIN - r, Math.max(MARGIN + r, p.x));
  if (isMobile()) x = p.x < window.innerWidth / 2 ? MARGIN + r : window.innerWidth - MARGIN - r;
  let bottom = window.innerHeight - MARGIN - r - (isMobile() ? avoidBottom : 0);

  // If a drawer is open, ensure Pip orb does not cover drawer controls or text
  if (typeof document !== "undefined") {
    const openDrawer = document.querySelector("[data-drawer-open='true']");
    if (openDrawer) {
      const b = openDrawer.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) {
        if (!isMobile()) {
          // Desktop: drawer is on the right. Keep Pip to the left of the drawer.
          if (b.left > window.innerWidth / 2) {
            x = Math.min(x, b.left - MARGIN - r);
          }
        } else {
          // Mobile: drawer is on the bottom. Keep Pip above the drawer.
          if (b.top < window.innerHeight) {
            bottom = Math.min(bottom, Math.max(top, b.top - MARGIN - r));
          }
        }
      }
    }

    // If a modal or blocking dialog is open, ensure Pip orb never covers modal controls or bounds
    const openModal = document.querySelector("[data-modal-open='true']");
    if (openModal) {
      const mb = openModal.getBoundingClientRect();
      if (mb.width > 0 && mb.height > 0) {
        const overlapsX = x + r > mb.left - MARGIN && x - r < mb.right + MARGIN;
        const overlapsY = p.y + r > mb.top - MARGIN && p.y - r < mb.bottom + MARGIN;
        if (overlapsX && overlapsY) {
          if (!isMobile()) {
            // x is Pip's centre: it needs a full diameter of room beside the box.
            if (mb.right + MARGIN + 2 * r <= window.innerWidth - MARGIN) {
              x = mb.right + MARGIN + r;
            } else {
              x = Math.max(MARGIN + r, mb.left - MARGIN - r);
            }
          } else {
            if (mb.top - MARGIN - r >= top) {
              bottom = Math.min(bottom, mb.top - MARGIN - r);
            }
          }
        }
      }
    }

    // On the compare workspace, ensure Pip orb never covers table, summary, controls, or header
    const compareElements = document.querySelectorAll(
      "[data-compare-header='true'], [data-compare-summary='true'], [data-compare-controls='true'], [data-compare-table='true']"
    );
    for (const el of compareElements) {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) {
        const overlapsX = x + r > b.left - MARGIN && x - r < b.right + MARGIN;
        const overlapsY = p.y + r > b.top - MARGIN && p.y - r < b.bottom + MARGIN;
        if (overlapsX && overlapsY) {
          if (!isMobile()) {
            // x is Pip's centre: it needs a full diameter of room beside the box.
            if (b.right + MARGIN + 2 * r <= window.innerWidth - MARGIN) {
              x = b.right + MARGIN + r;
            } else if (b.left - MARGIN - 2 * r >= MARGIN) {
              x = b.left - MARGIN - r;
            } else {
              top = Math.max(top, b.bottom + MARGIN + r);
            }
          } else {
            // Mobile: push below or above element; if element covers screen, park in bottom clearance
            if (b.bottom + MARGIN + r <= window.innerHeight - MARGIN) {
              top = Math.max(top, b.bottom + MARGIN + r);
            } else if (b.top - MARGIN - r >= HEADER_H + MARGIN) {
              bottom = Math.min(bottom, b.top - MARGIN - r);
            } else {
              bottom = window.innerHeight - MARGIN - r;
            }
          }
        }
      }
    }
  }

  // Invariant: whatever the avoidance rules chose, the orb stays fully inside the viewport.
  x = Math.min(window.innerWidth - MARGIN - r, Math.max(MARGIN + r, x));
  return { x, y: Math.min(bottom, Math.max(top, p.y)) };
}

export function cornerPoint(corner: Corner, size: number): Point {
  const r = size / 2;
  const x = corner.endsWith("l") ? MARGIN + r : window.innerWidth - MARGIN - r;
  const y = corner.startsWith("t") ? HEADER_H + MARGIN + r : window.innerHeight - MARGIN - r;
  return { x, y };
}

export function nearestCorner(p: Point = live): Corner {
  const v = p.y < window.innerHeight / 2 ? "t" : "b";
  const h = p.x < window.innerWidth / 2 ? "l" : "r";
  return `${v}${h}` as Corner;
}

/** Default resting spot: right side, lower third (where a docked assistant is expected). */
export function homePoint(size = live.size): Point {
  const isCompare = typeof window !== "undefined" && window.location.pathname.startsWith("/compare");
  if (isCompare) {
    return clampToViewport(
      {
        x: window.innerWidth - MARGIN - size / 2 - 4,
        y: window.innerHeight - MARGIN - size / 2 - 4,
      },
      size,
    );
  }
  return clampToViewport({ x: window.innerWidth - MARGIN - size / 2 - 8, y: window.innerHeight * 0.72 }, size);
}

function setSize(size: number, duration: number) {
  sizeTween?.kill();
  if (duration <= 0) {
    live.size = size;
    return;
  }
  sizeTween = gsap.to(live, { size, duration, ease: "expo.inOut" });
}

function anchorTarget(): Point | null {
  const el = state.anchorEl;
  if (!el || !el.isConnected) return null;
  const p = state.place?.(el, state.targetSize);
  if (!p) return null;
  return p;
}

export interface FlyOptions {
  mode?: Exclude<PipMode, "dragging">;
  size?: number;
  /** Anchored flights: the element and how to place Pip beside it. */
  anchor?: Element | null;
  place?: PlaceFn;
  /** Arc height multiplier (0 = straight). */
  arc?: number;
  instant?: boolean;
}

/**
 * Flies Pip to a point (or an anchor) along a curved quadratic bezier with expo.inOut.
 * Eyes look at the destination first; the body stretches along velocity and squashes on landing.
 */
export function flyTo(target: Point | null, opts: FlyOptions = {}): Promise<void> {
  const mode = opts.mode ?? (opts.anchor ? "anchored" : "free");
  const size = opts.size ?? live.size;
  state.targetSize = size;
  state.anchorEl = opts.anchor ?? null;
  state.place = opts.place ?? state.place;
  const dest = () => clampToViewport((opts.anchor ? anchorTarget() : null) ?? target ?? rest, size);

  flight?.kill();
  const from = { x: live.x, y: live.y };
  const d0 = dest();
  const dist = Math.hypot(d0.x - from.x, d0.y - from.y);

  const finish = () => {
    state.flying = false;
    state.mode = mode;
    const d = dest();
    rest.x = d.x;
    rest.y = d.y;
    notify();
  };

  if (opts.instant || motion.reduced || !state.initialized || dist < 2) {
    state.initialized = true;
    live.x = d0.x;
    live.y = d0.y;
    setSize(size, 0);
    finish();
    pipRuntime.invalidate?.();
    return Promise.resolve();
  }

  const duration = Math.min(0.9, Math.max(0.3, 0.3 + dist / 1400));
  // Look first, then go.
  pip.glanceAt(d0.x, d0.y, (duration + 0.35) * 1000);
  state.flying = true;
  state.mode = mode;
  setSize(size, duration);
  notify();

  // Arc: perpendicular offset from the midpoint, biased upward like a hop.
  const arc = (opts.arc ?? 1) * Math.min(140, dist * 0.28);
  const prog = { t: 0 };
  return new Promise((resolve) => {
    flight = gsap.to(prog, {
      t: 1,
      duration,
      delay: 0.12,
      ease: "expo.inOut",
      onUpdate: () => {
        const d = dest(); // anchors can move (scroll) mid-flight
        const mx = (from.x + d.x) / 2;
        const my = (from.y + d.y) / 2;
        const dx = d.x - from.x;
        const dy = d.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len;
        let ny = dx / len;
        if (ny > 0) {
          nx = -nx;
          ny = -ny;
        }
        const cx = mx + nx * arc;
        const cy = my + ny * arc;
        const t = prog.t;
        const u = 1 - t;
        live.x = u * u * from.x + 2 * u * t * cx + t * t * d.x;
        live.y = u * u * from.y + 2 * u * t * cy + t * t * d.y;
      },
      onComplete: () => {
        flight = null;
        finish();
        pip.react("land");
        resolve();
      },
    });
  });
}

export function park(corner: Corner = nearestCorner(), size = sizeFor("parked")) {
  return flyTo(cornerPoint(corner, size), { mode: "parked", size });
}

export function setFollow(on: boolean) {
  flight?.kill();
  state.flying = false;
  state.anchorEl = null;
  state.mode = on ? "follow" : "free";
  rest.x = live.x;
  rest.y = live.y;
  notify();
}

// ── Dragging ──

export function beginDrag(pointer: Point) {
  flight?.kill();
  state.flying = false;
  state.anchorEl = null;
  state.grab = { x: pointer.x - live.x, y: pointer.y - live.y };
  state.mode = "dragging";
  notify();
}

export function endDrag() {
  if (state.mode !== "dragging") return;
  state.mode = "free";
  rest.x = live.x;
  rest.y = live.y;
  pip.react("land");
  notify();
}

/** Re-clamps resting spots after a resize. */
export function onResize() {
  const r = clampToViewport(rest, live.size);
  rest.x = r.x;
  rest.y = r.y;
  if (state.mode === "parked") {
    const c = cornerPoint(nearestCorner(rest), live.size);
    rest.x = c.x;
    rest.y = c.y;
  }
}

/**
 * Per-frame update. Returns the orb centre and diameter to render, and publishes velocity
 * for squash-and-stretch.
 */
export function frame(now: number): Live {
  const dt = state.lastT ? Math.min(0.05, (now - state.lastT) / 1000) : 1 / 60;
  state.lastT = now;
  const px = live.x;
  const py = live.y;
  const k = (lambda: number) => 1 - Math.exp(-lambda * dt);

  if (!state.flying) {
    switch (state.mode) {
      case "dragging": {
        const p = pipRuntime.pointer;
        live.x += (p.x - state.grab.x - live.x) * k(30);
        live.y += (p.y - state.grab.y - live.y) * k(30);
        break;
      }
      case "anchored": {
        const t = anchorTarget();
        if (!t && (state.lostSince === 0 || now - state.lostSince < ANCHOR_GRACE_MS)) {
          // Briefly off screen (a drawer sliding in, a re-flow): hold position for a moment.
          if (state.lostSince === 0) state.lostSince = now;
          break;
        }
        if (!t) {
          state.lostSince = 0;
          const last = { x: live.x, y: live.y };
          state.mode = "free";
          state.anchorEl = null;
          rest.x = live.x;
          rest.y = live.y;
          notify();
          onAnchorLost?.(last);
          break;
        }
        state.lostSince = 0;
        const c = clampToViewport(t, live.size);
        live.x += (c.x - live.x) * k(14);
        live.y += (c.y - live.y) * k(14);
        break;
      }
      case "follow": {
        const p = pipRuntime.pointer;
        // Sit 150px from the cursor, on the side facing the screen centre (never on top of it).
        const dx = window.innerWidth / 2 - p.x;
        const dy = window.innerHeight / 2 - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = clampToViewport({ x: p.x + (dx / len) * 150, y: p.y + (dy / len) * 150 }, live.size);
        live.x += (t.x - live.x) * k(2.5);
        live.y += (t.y - live.y) * k(2.5);
        break;
      }
      case "free":
      case "parked": {
        const c = avoidBottom && isMobile() ? clampToViewport(rest, live.size) : rest;
        live.x += (c.x - live.x) * k(10);
        live.y += (c.y - live.y) * k(10);
        break;
      }
    }
  }

  // Gentle wander when resting free (ramps in after landing so there's no jump).
  state.wander += ((state.mode === "free" && !state.flying && !motion.reduced ? 1 : 0) - state.wander) * k(1.5);
  const t = now / 1000;
  // On mobile Pip hugs the screen edge, so it only bobs vertically.
  const mobile = isMobile();
  const wx = mobile ? 0 : Math.sin(t * 0.31) * 20 * state.wander;
  const wy = Math.sin(t * 0.23 + 1.3) * (mobile ? 6 : 14) * state.wander;

  // Smoothed velocity (px/s) for the scene's stretch.
  const vx = (live.x - px) / dt;
  const vy = (live.y - py) / dt;
  state.vx += (vx - state.vx) * k(18);
  state.vy += (vy - state.vy) * k(18);
  pipRuntime.velocity.x = state.vx;
  pipRuntime.velocity.y = state.vy;

  return { x: live.x + wx, y: live.y + wy, size: live.size };
}
