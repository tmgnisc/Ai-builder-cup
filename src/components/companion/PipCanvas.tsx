"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/motion";
import { PipScene } from "./PipScene";

/**
 * The one WebGL context for Pip. Loaded client-only via next/dynamic.
 * - frameloop "never" while the tab is hidden; "demand" under reduced motion (still poses).
 * - DPR starts at [1, 2] and is then managed by the scene from Pip's displayed size.
 */
export default function PipCanvas() {
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop={hidden ? "never" : reduced ? "demand" : "always"}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 7.2], fov: 30, near: 0.1, far: 50 }}
      style={{ pointerEvents: "none" }}
      // The host is scaled with a CSS transform; measure layout size, not the transformed rect.
      resize={{ offsetSize: true, scroll: false }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <PipScene reduced={reduced} />
    </Canvas>
  );
}
