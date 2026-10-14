"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { getAnchors } from "@/lib/guide/anchors";
import { lastPlacement } from "@/lib/guide/placement";

/** Dev overlay (toggled from /playground): anchor rects, placement candidates and avoid zones. */
export const useDebugOverlay = create<{ on: boolean; toggle: () => void }>()((set) => ({ on: false, toggle: () => set((s) => ({ on: !s.on })) }));

interface Box {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  kind: "anchor" | "ok" | "bad" | "avoid" | "chosen";
}

const COLORS: Record<Box["kind"], string> = {
  anchor: "rgb(61 217 255 / 0.8)",
  ok: "rgb(198 255 61 / 0.7)",
  chosen: "rgb(198 255 61 / 1)",
  bad: "rgb(255 90 90 / 0.7)",
  avoid: "rgb(255 178 61 / 0.8)",
};

export function AnchorDebug() {
  const on = useDebugOverlay((s) => s.on);
  const [boxes, setBoxes] = useState<Box[]>([]);

  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => {
      const out: Box[] = [];
      for (const a of getAnchors()) {
        if (a.visible <= 0) continue;
        const r = a.el.getBoundingClientRect();
        out.push({ key: `a-${a.id}`, left: r.left, top: r.top, width: r.width, height: r.height, label: `${a.id} · ${a.topic} · ${Math.round(a.visible * 100)}%`, kind: "anchor" });
      }
      lastPlacement.candidates.forEach((c, i) =>
        out.push({ key: `c-${i}`, left: c.box.left, top: c.box.top, width: c.box.right - c.box.left, height: c.box.bottom - c.box.top, label: c.side, kind: c.side === lastPlacement.chosen ? "chosen" : c.ok ? "ok" : "bad" }),
      );
      lastPlacement.avoid.forEach((z, i) => out.push({ key: `z-${i}`, left: z.left, top: z.top, width: z.right - z.left, height: z.bottom - z.top, label: "avoid", kind: "avoid" }));
      setBoxes(out);
    }, 200);
    return () => window.clearInterval(id);
  }, [on]);

  if (!on) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      {boxes.map((b) => (
        <div
          key={b.key}
          className="absolute rounded-md"
          style={{ left: b.left, top: b.top, width: b.width, height: b.height, outline: `1.5px ${b.kind === "anchor" ? "dashed" : "solid"} ${COLORS[b.kind]}` }}
        >
          <span className="absolute -top-4 left-0 whitespace-nowrap rounded bg-black/80 px-1 font-mono text-[9px] text-white">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
