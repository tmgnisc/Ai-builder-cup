"use client";

import { create } from "zustand";
import * as pilot from "@/components/companion/pilot";
import type { Corner, PipMode, Point, SizeKey } from "@/components/companion/pilot";
import { placeBeside, resetPlacement } from "@/lib/guide/placement";

/**
 * Pip's position model (UI-facing). The live, per-frame position lives in `pilot.ts`;
 * this store mirrors the mode/target so React UI (bubble, menus, debug) can follow it.
 * Moving Pip is a reaction: it never changes the agent state.
 */

export interface PipPositionState {
  x: number;
  y: number;
  size: number;
  mode: PipMode;
  anchorId: string | null;
  corner: Corner | null;
  /** Bumped on every settled move so bubbles can re-position. */
  rev: number;
  flyToPoint: (p: Point, opts?: { size?: SizeKey | number; mode?: "free" | "parked" }) => Promise<void>;
  /** Fly beside a `[data-pip-anchor="id"]` element (or an element directly). */
  flyToAnchor: (target: string | Element, opts?: { size?: SizeKey | number; place?: pilot.PlaceFn }) => Promise<boolean>;
  park: (corner?: Corner) => Promise<void>;
  goHome: () => Promise<void>;
  setFollow: (on: boolean) => void;
}

const sizeOf = (s: SizeKey | number | undefined, fallback: SizeKey) => (typeof s === "number" ? s : pilot.sizeFor(s ?? fallback));

export function findAnchor(id: string): Element | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(`[data-pip-anchor="${CSS.escape(id)}"]`);
}

export const usePipPosition = create<PipPositionState>()((set, get) => {
  const sync = (extra: Partial<PipPositionState> = {}) => {
    const l = pilot.getLive();
    set({ x: l.x, y: l.y, size: l.size, mode: pilot.getMode(), rev: get().rev + 1, ...extra });
  };
  if (typeof window !== "undefined") pilot.onPilotChange(() => sync());

  return {
    x: -500,
    y: -500,
    size: 120,
    mode: "free",
    anchorId: null,
    corner: null,
    rev: 0,
    flyToPoint: async (p, opts = {}) => {
      set({ anchorId: null, corner: null });
      await pilot.flyTo(p, { mode: opts.mode ?? "free", size: sizeOf(opts.size, "free") });
    },
    flyToAnchor: async (target, opts = {}) => {
      const el = typeof target === "string" ? findAnchor(target) : target;
      if (!el) return false;
      const id = typeof target === "string" ? target : (el.getAttribute("data-pip-anchor") ?? null);
      set({ anchorId: id, corner: null });
      resetPlacement(el);
      await pilot.flyTo(null, { anchor: el, place: opts.place ?? placeBeside, size: sizeOf(opts.size, "anchored") });
      return true;
    },
    park: async (corner) => {
      const c = corner ?? pilot.nearestCorner();
      set({ anchorId: null, corner: c });
      await pilot.park(c);
    },
    goHome: async () => {
      set({ anchorId: null, corner: null });
      const size = pilot.sizeFor("free");
      await pilot.flyTo(pilot.homePoint(size), { mode: "free", size });
    },
    setFollow: (on) => {
      set({ anchorId: null, corner: null });
      pilot.setFollow(on);
    },
  };
});
