"use client";

import { useRef } from "react";
import { gsap, motion, useGSAP } from "@/lib/motion";

/** Skip the very first mount so server-rendered content isn't hidden and re-faded on load. */
let firstMount = true;

/** Route transition: quick fade + rise on every navigation. Layout-level UI (Pip, cart) is unaffected. */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (firstMount) {
        firstMount = false;
        return;
      }
      if (motion.reduced) return;
      gsap.from(ref.current, { autoAlpha: 0, y: 12, duration: 0.45, ease: "expo.out", clearProps: "all" });
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
