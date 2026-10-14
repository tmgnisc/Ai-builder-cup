"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, motion, useGSAP } from "@/lib/motion";

interface ScrambleTextProps {
  text: string;
  duration?: number;
  className?: string;
  chars?: string;
  /** Skip the scramble (e.g. a live transcript that updates several times per second). */
  instant?: boolean;
}

/** Text that scrambles into its new value whenever `text` changes. Used for Pip's state caption. */
export function ScrambleText({ text, duration = 0.6, className, chars = "▪▫◆◇·:/\\_-", instant = false }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (first.current || motion.reduced || instant) {
        first.current = false;
        el.textContent = text;
        return;
      }
      gsap.to(el, {
        duration,
        ease: "none",
        overwrite: true,
        scrambleText: { text, chars, speed: 0.6, revealDelay: 0.15 },
      });
    },
    { dependencies: [text], scope: ref },
  );

  return (
    <span className={cn("inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden>
        {text}
      </span>
    </span>
  );
}
