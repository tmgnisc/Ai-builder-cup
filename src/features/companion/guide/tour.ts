"use client";

import { useSpotlight } from "./Spotlight";
import { pip } from "../runtime";
import { motion } from "@/lib/motion";
import { useBubble } from "@/store/useBubble";
import { markTourDone, useGuide } from "@/store/useGuide";
import { findAnchor, usePipPosition } from "@/store/usePipPosition";

/**
 * First-visit tour: Pip flies anchor to anchor with a dimmed spotlight on each stop.
 * Skippable at every step (chip, ✕, Escape, or saying "skip").
 */

interface Stop {
  anchor: () => Element | null;
  text: string;
}

const STOPS: Stop[] = [
  { anchor: () => findAnchor("hero-prompt"), text: "Tell me what you need right here. You can also press **/** anywhere, or hold **V** and just talk." },
  { anchor: () => findAnchor("categories"), text: "Browse by category. When you pause on something, I'll tell you what stands out." },
  { anchor: () => findAnchor("filter-price"), text: "Filters narrow things down. If you keep juggling the price, I'll ask what matters most." },
  { anchor: () => document.querySelector('[data-pip-topic="product-card"]'), text: "Every product card has verified specs: I'll compare hardware trade-offs, check stock, and give you real numbers, never guesses." },
  { anchor: () => findAnchor("cart-button"), text: "When I add something, I re-check your cart so “added” always means added. Checkout is always your call." },
];

const YES = /^(yes|yeah|yep|sure|ok(ay)?|go|show me|let'?s go|start)\b/i;
const NO = /^(skip|no|nope|later|not now|nah|stop)\b/i;

function endTour(outcome: "skipped" | "finished") {
  markTourDone(outcome);
  useGuide.getState().setTourStep(null);
  useSpotlight.getState().hide();
  useBubble.getState().close("system");
  void usePipPosition.getState().goHome();
}

async function goToStop(i: number) {
  const stop = STOPS[i];
  if (!stop) return endTour("finished");
  useGuide.getState().setTourStep(i);
  const el = stop.anchor();
  if (!el) return goToStop(i + 1);
  el.scrollIntoView({ block: "center", behavior: motion.reduced ? "auto" : "smooth" });
  await new Promise((r) => setTimeout(r, motion.reduced ? 50 : 550));
  if (useGuide.getState().tourStep !== i) return; // skipped meanwhile
  await usePipPosition.getState().flyToAnchor(el);
  useSpotlight.getState().show(el, { dim: true, ms: 0 });
  const last = i === STOPS.length - 1;
  useBubble.getState().show({
    kind: "tip",
    id: `tour:${i}`,
    source: "system",
    text: `**${i + 1}/${STOPS.length}** · ${stop.text}`,
    chips: [
      { label: last ? "Finish" : "Next →", primary: true, run: () => void goToStop(i + 1) },
      { label: "Skip tour", run: () => endTour("skipped") },
    ],
    onReply: (text) => {
      if (NO.test(text.trim())) return endTour("skipped"), true;
      if (/^(next|yes|ok|go on|continue)\b/i.test(text.trim())) return void goToStop(i + 1), true;
      return false;
    },
    onClose: (reason) => {
      if (reason === "user" && useGuide.getState().tourStep === i) endTour("skipped");
    },
  });
}

/** The first-visit offer, shown on the landing page. */
export function offerTour() {
  pip.react("hop");
  useGuide.getState().update((s) => ({ ...s, introsSeen: [...new Set([...s.introsSeen, "home" as const])] }));
  useBubble.getState().show({
    kind: "tip",
    id: "tour:offer",
    source: "system",
    text: "Pip on bench. Need a quick 20-second walk-through of specs, trade-offs, and valley delivery?",
    chips: [
      { label: "Yes, show me", primary: true, run: () => void goToStop(0) },
      { label: "Skip", run: () => endTour("skipped") },
    ],
    onReply: (text) => {
      if (YES.test(text.trim())) return void goToStop(0), true;
      if (NO.test(text.trim())) return endTour("skipped"), true;
      return false;
    },
    onClose: (reason) => {
      if (reason === "user") markTourDone("skipped");
    },
  }, { input: true });
}

export function startTour() {
  void goToStop(0);
}
