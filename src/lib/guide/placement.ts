"use client";

import type { Point } from "@/components/companion/pilot";

/** Centre Pip inside an anchor (hero / playground stage). */
export function placeCenter(anchor: Element): Point | null {
  const r = anchor.getBoundingClientRect();
  if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Simple beside-the-element placement (replaced by smart placement in step 3). */
export function placeBeside(anchor: Element, size: number): Point | null {
  const r = anchor.getBoundingClientRect();
  if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return null;
  const gap = 12 + size / 2;
  const right = r.right + gap;
  const x = right + size / 2 < window.innerWidth ? right : r.left - gap;
  return { x, y: r.top + Math.min(r.height / 2, 80) };
}
