"use client";

import dynamic from "next/dynamic";
import { useTryOn } from "@/store/useTryOn";

// The studio (and MediaPipe behind it) only loads once someone opens a try-on.
const TryOnStudio = dynamic(() => import("./TryOnStudio"), { ssr: false });

export function TryOnLayer() {
  const everOpened = useTryOn((s) => s.open || s.productId !== null);
  return everOpened ? <TryOnStudio /> : null;
}
