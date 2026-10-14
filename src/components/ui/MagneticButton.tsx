"use client";

import { useRef } from "react";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { Button, type ButtonProps } from "./Button";

interface MagneticButtonProps extends ButtonProps {
  /** 0–1: how far the button follows the pointer, as a fraction of the offset from its centre. */
  strength?: number;
}

/** A Button that drifts toward the cursor and springs back on leave. No-op under reduced motion. */
export function MagneticButton({ strength = 0.3, children, ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || motion.reduced) return;
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "expo.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "expo.out" });

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref, dependencies: [strength] },
  );

  return (
    <span ref={ref} className="inline-flex will-change-transform">
      <Button {...props}>{children}</Button>
    </span>
  );
}
