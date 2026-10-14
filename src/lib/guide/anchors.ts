"use client";

import { useSyncExternalStore } from "react";

/**
 * Registry of guide-worthy elements, marked in the DOM with:
 *   data-pip-anchor="id"     unique id (e.g. "card:acer-swift-go-14", "spec:battery")
 *   data-pip-topic="topic"   what it is (e.g. "product-card", "spec-battery", "price-slider")
 *   data-pip-product="id"    optional product context for tips
 * A MutationObserver tracks elements as they mount/unmount; an IntersectionObserver tracks
 * how visible each one is. Rects are read on demand (always fresh, no stale caches).
 */

export interface AnchorInfo {
  id: string;
  topic: string;
  productId: string | null;
  el: Element;
  /** 0–1 visible fraction (IntersectionObserver). */
  visible: number;
}

const anchors = new Map<Element, AnchorInfo>();
const listeners = new Set<() => void>();
let version = 0;
let started = false;
let io: IntersectionObserver | null = null;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function read(el: Element): AnchorInfo | null {
  const id = el.getAttribute("data-pip-anchor");
  if (!id) return null;
  return { id, topic: el.getAttribute("data-pip-topic") ?? id, productId: el.getAttribute("data-pip-product"), el, visible: anchors.get(el)?.visible ?? 0 };
}

function scan() {
  const found = new Set(document.querySelectorAll("[data-pip-anchor]"));
  let changed = false;
  for (const el of found) {
    if (!anchors.has(el)) {
      const info = read(el);
      if (!info) continue;
      anchors.set(el, info);
      io?.observe(el);
      changed = true;
    }
  }
  for (const el of [...anchors.keys()]) {
    if (!found.has(el)) {
      anchors.delete(el);
      io?.unobserve(el);
      changed = true;
    }
  }
  if (changed) emit();
}

export function startAnchorRegistry() {
  if (started || typeof window === "undefined") return;
  started = true;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const a = anchors.get(e.target);
        if (a) a.visible = e.isIntersecting ? e.intersectionRatio : 0;
      }
      emit();
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-pip-anchor"] });
  scan();
}

export function subscribeAnchors(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAnchors(): AnchorInfo[] {
  return [...anchors.values()];
}

export function getAnchor(id: string): AnchorInfo | undefined {
  for (const a of anchors.values()) if (a.id === id) return a;
  return undefined;
}

export function visibleAnchors(minRatio = 0.5): AnchorInfo[] {
  return getAnchors().filter((a) => a.visible >= minRatio);
}

const rectOf = (a: AnchorInfo) => a.el.getBoundingClientRect();

/**
 * The anchor at (or nearest to, within `radius`) a screen point. The smallest containing
 * anchor wins, so a spec row beats the spec table it sits in.
 */
export function anchorAt(x: number, y: number, radius = 120): AnchorInfo | null {
  let best: { a: AnchorInfo; score: number } | null = null;
  for (const a of anchors.values()) {
    if (a.visible <= 0) continue;
    const r = rectOf(a);
    const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    const dist = Math.hypot(dx, dy);
    if (!inside && dist > radius) continue;
    const score = inside ? r.width * r.height : 1e9 + dist;
    if (!best || score < best.score) best = { a, score };
  }
  return best?.a ?? null;
}

/** The most visible anchor (largest visible area), optionally filtered. */
export function mostVisibleAnchor(filter: (a: AnchorInfo) => boolean = () => true): AnchorInfo | null {
  let best: { a: AnchorInfo; area: number } | null = null;
  for (const a of anchors.values()) {
    if (a.visible < 0.5 || !filter(a)) continue;
    const r = rectOf(a);
    const area = r.width * r.height * a.visible;
    if (!best || area > best.area) best = { a, area };
  }
  return best?.a ?? null;
}

/** React hook: re-renders when the registry or visibility changes (debug overlay, playground). */
export function useAnchors(): AnchorInfo[] {
  useSyncExternalStore(subscribeAnchors, () => version, () => 0);
  return getAnchors();
}
