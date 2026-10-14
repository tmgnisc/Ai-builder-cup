"use client";

import { HEADER_H, MARGIN, type Point } from "@/components/companion/pilot";
import { pipRuntime } from "@/components/companion/runtime";

/**
 * Where to put Pip next to a target element without blocking the user.
 *
 * Order: right → left → above → below. A spot must keep Pip's orb fully on screen (16px
 * margin, below the header) and must not cover the cursor (±80px), the focused input or an
 * open drawer. The chosen side is remembered per element, so a tracked anchor doesn't jitter
 * when the cursor moves; Pip only avoids the cursor when it *chooses* a spot.
 */

export type PlaceSide = "right" | "left" | "above" | "below";
const ORDER: PlaceSide[] = ["right", "left", "above", "below"];
const GAP = 14;
const CURSOR_PAD = 80;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const memo = new WeakMap<Element, PlaceSide>();
/** Last decision, for the playground's debug overlay. */
export const lastPlacement: { candidates: { side: PlaceSide; box: Box; ok: boolean }[]; chosen: PlaceSide | null; avoid: Box[] } = {
  candidates: [],
  chosen: null,
  avoid: [],
};

export function resetPlacement(el: Element) {
  memo.delete(el);
}

const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const area = (a: Box, b: Box) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

function avoidZones(): Box[] {
  const zones: Box[] = [];
  const p = pipRuntime.pointer;
  if (performance.now() - p.t < 10_000) zones.push({ left: p.x - CURSOR_PAD, right: p.x + CURSOR_PAD, top: p.y - CURSOR_PAD, bottom: p.y + CURSOR_PAD });
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA") && !active.closest(".bubble-panel")) zones.push(active.getBoundingClientRect());
  document.querySelectorAll("[data-sheet-open='true']").forEach((d) => zones.push(d.getBoundingClientRect()));
  return zones;
}

function candidate(side: PlaceSide, r: DOMRect, R: number): Point {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  // Beside: align to the element's upper part (cards are tall); above/below: centred.
  const cy = Math.min(Math.max(r.top + Math.min(r.height / 2, 70), HEADER_H + MARGIN + R), vh - MARGIN - R);
  const cx = Math.min(Math.max(r.left + r.width / 2, MARGIN + R), vw - MARGIN - R);
  switch (side) {
    case "right":
      return { x: r.right + GAP + R, y: cy };
    case "left":
      return { x: r.left - GAP - R, y: cy };
    case "above":
      return { x: cx, y: r.top - GAP - R };
    case "below":
      return { x: cx, y: r.bottom + GAP + R };
  }
}

function fits(p: Point, R: number): boolean {
  return p.x - R >= MARGIN && p.x + R <= window.innerWidth - MARGIN && p.y - R >= HEADER_H + MARGIN && p.y + R <= window.innerHeight - MARGIN;
}

/** Pip's spot beside `anchor`, or null when the anchor is off screen. */
export function placeBeside(anchor: Element, size: number): Point | null {
  const r = anchor.getBoundingClientRect();
  const R = size / 2;
  // Header controls (e.g. the cart icon): sit just below them.
  if (r.width > 0 && r.top >= 0 && r.bottom <= HEADER_H + 4 && anchor.closest("header")) {
    return { x: Math.min(Math.max(r.left + r.width / 2, MARGIN + R), window.innerWidth - MARGIN - R), y: HEADER_H + MARGIN + R };
  }
  if (r.width === 0 || r.bottom < HEADER_H || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;

  // Mobile: Pip stays on the nearer screen edge, just above (or below) the element.
  if (window.innerWidth < 768) {
    const x = r.left + r.width / 2 < window.innerWidth / 2 ? MARGIN + R : window.innerWidth - MARGIN - R;
    const above = r.top - GAP - R;
    const y = above - R >= HEADER_H + MARGIN ? above : r.bottom + GAP + R;
    return { x, y: Math.min(y, window.innerHeight - MARGIN - R) };
  }

  const remembered = memo.get(anchor);
  if (remembered) {
    const p = candidate(remembered, r, R);
    if (fits(p, R)) return p;
  }

  const avoid = avoidZones();
  const evaluated = ORDER.map((side) => {
    const p = candidate(side, r, R);
    const box = { left: p.x - R, right: p.x + R, top: p.y - R, bottom: p.y + R };
    const fit = fits(p, R);
    const clash = avoid.reduce((s, z) => s + (overlaps(box, z) ? area(box, z) : 0), 0);
    return { side, p, box, ok: fit && clash === 0, fit, clash };
  });
  const choice = evaluated.find((c) => c.ok) ?? evaluated.filter((c) => c.fit).sort((a, b) => a.clash - b.clash)[0];

  lastPlacement.candidates = evaluated.map(({ side, box, ok }) => ({ side, box, ok }));
  lastPlacement.avoid = avoid;
  lastPlacement.chosen = choice?.side ?? null;

  if (!choice) {
    // Nothing fits (e.g. a full-width element): hug the right edge at the element's height.
    return { x: window.innerWidth - MARGIN - R, y: Math.min(Math.max(r.top + R, HEADER_H + MARGIN + R), window.innerHeight - MARGIN - R) };
  }
  memo.set(anchor, choice.side);
  return choice.p;
}

/** Centre Pip inside an anchor (hero / playground stage). */
export function placeCenter(anchor: Element): Point | null {
  const r = anchor.getBoundingClientRect();
  if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
