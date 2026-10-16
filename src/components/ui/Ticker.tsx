"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, motion, useGSAP } from "@/lib/motion";

interface TickerProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-IN");

/**
 * Animated number. Screen readers get the final value from a visually hidden copy;
 * the rolling digits are aria-hidden.
 */
export function Ticker({ value, format = defaultFormat, duration = 0.8, className }: TickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef({ n: value });

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (motion.reduced) {
        current.current.n = value;
        el.textContent = format(value);
        return;
      }
      gsap.to(current.current, {
        n: value,
        duration: motion.dur(duration),
        ease: "expo.out",
        overwrite: true,
        onUpdate: () => {
          el.textContent = format(current.current.n);
        },
      });
    },
    { dependencies: [value], scope: ref },
  );

  return (
    <span className={cn("tabular font-mono", className)} aria-label={format(value)}>
      <span className="sr-only">{format(value)}</span>
      <span ref={ref} aria-hidden="true">
        {format(current.current.n)}
      </span>
    </span>
  );
}
