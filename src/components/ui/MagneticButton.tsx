"use client";

import { useRef } from "react";
import { useMagnetic } from "@/lib/useMagnetic";
import { Button, type ButtonProps } from "./Button";

interface MagneticButtonProps extends ButtonProps {
  /** 0–1: how far the button follows the pointer, as a fraction of the offset from its centre. */
  strength?: number;
}

/** A Button that drifts toward the cursor and springs back on leave. No-op under reduced motion. */
export function MagneticButton({ strength = 0.3, children, ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useMagnetic(ref, strength);
  return (
    <span ref={ref} className="inline-flex will-change-transform">
      <Button {...props}>{children}</Button>
    </span>
  );
}
