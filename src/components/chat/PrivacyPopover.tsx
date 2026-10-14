"use client";

import { Shield } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/** Plain-language disclosure of what context Pip uses and where it goes. */
export function PrivacyPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        aria-label="What Pip knows (privacy)"
        title="Privacy"
        className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
      >
        <Shield className="size-4" />
      </button>
      {open && (
        <div id={id} role="region" aria-label="Privacy" className="absolute right-0 top-10 z-10 w-72 rounded-2xl bg-surface p-4 text-xs leading-relaxed text-muted shadow-2xl hairline">
          <p className="font-display text-sm font-semibold text-text">What Pip uses</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4">
            <li>
              <span className="text-text">Your messages</span> and a short memory of this chat (last results and comparisons), sent to this store&apos;s server only when you message Pip.
            </li>
            <li>
              <span className="text-text">This session&apos;s browsing:</span> product views, filter changes, cart and compare actions. Used only in your browser to offer suggestions; never sent anywhere.
            </li>
            <li>
              <span className="text-text">Your cart</span>, to add, remove and verify items. Pip never checks out or pays.
            </li>
            <li>
              <span className="text-text">Microphone</span>, only while the mic button is on. Your browser&apos;s speech recognition transcribes it (Chrome uses Google&apos;s speech service). Loudness is measured locally to animate Pip.
            </li>
          </ul>
          <p className="mt-2.5">
            <span className="text-text">Pause</span> stops suggestions. <span className="text-text">Reset memory</span> forgets the chat and this session&apos;s signals. Nothing is stored after you close the tab.
          </p>
        </div>
      )}
    </div>
  );
}
