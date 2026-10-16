"use client";

import { useEffect } from "react";
import { pipRuntime } from "./runtime";

/** Records the last pointer position + time for Pip's eyes. The scene handles damping and the 4 s idle return. */
export function usePointerGaze() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pipRuntime.pointer.x = e.clientX;
      pipRuntime.pointer.y = e.clientY;
      pipRuntime.pointer.t = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}
