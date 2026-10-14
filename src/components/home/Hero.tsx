"use client";

import { ArrowUp, Mic } from "lucide-react";
import { useRef, useState } from "react";
import { pip } from "@/components/companion/runtime";
import { gsap, motion, SplitText, useGSAP } from "@/lib/motion";
import { useMagnetic } from "@/lib/useMagnetic";

const EXAMPLES = [
  "A laptop under 1.2 lakh for coding",
  "Noise-cancelling headphones for flights",
  "Best camera phone below 90k",
];

/**
 * Landing hero: SplitText headline reveal, example chips that type themselves in,
 * and the prompt input. Pip's own hero anchor sits beside it (see CompanionLayer).
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);
  const micRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");

  useMagnetic(sendRef, 0.35);
  useMagnetic(micRef, 0.35);

  useGSAP(
    () => {
      const headline = root.current?.querySelector<HTMLElement>("[data-split]");
      if (!headline) return;
      const ready = () => headline.setAttribute("data-split-ready", "");

      if (motion.reduced) {
        ready();
        return;
      }

      const tl = gsap.timeline({ delay: 0.15 });
      SplitText.create(headline, {
        type: "words,chars",
        autoSplit: true,
        onSplit(self) {
          ready();
          return tl.from(
            self.chars,
            { yPercent: 110, rotate: 6, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.022 },
            0,
          );
        },
      });

      tl.from("[data-hero-fade]", { autoAlpha: 0, y: 16, duration: 0.8, ease: "expo.out", stagger: 0.08 }, 0.45);

      // Chips type themselves in, one after another.
      const chips = gsap.utils.toArray<HTMLElement>("[data-chip-text]");
      chips.forEach((chip, i) => {
        const full = chip.dataset.chipText ?? "";
        const state = { n: 0 };
        const pill = chip.closest("li");
        chip.textContent = "";
        gsap.set(pill, { autoAlpha: 0, y: 6 });
        tl.to(pill, { autoAlpha: 1, y: 0, duration: 0.3, ease: "expo.out", onStart: () => chip.classList.add("caret") }, 1 + i * 0.75);
        tl.to(
          state,
          {
            n: full.length,
            duration: full.length * 0.028,
            ease: "none",
            onUpdate: () => {
              chip.textContent = full.slice(0, Math.round(state.n));
            },
            onComplete: () => chip.classList.remove("caret"),
          },
          1 + i * 0.75,
        );
      });
    },
    { scope: root },
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) {
      inputRef.current?.focus();
      return;
    }
    // Phase 4 hands the prompt to the agent and opens the chat dock.
    pip.react("hop");
  }

  return (
    <section ref={root} className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p data-hero-fade className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs text-muted hairline">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" aria-hidden />
          Meet Pip, your shopping companion
        </p>
        <h1
          data-split
          className="font-display text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.03em] [&_.char]:inline-block"
        >
          Shopping, with someone who <span className="text-accent-text">gets it.</span>
        </h1>
        <p data-hero-fade className="mt-5 max-w-xl text-lg text-muted">
          Tell Pip what you need in plain words. It searches the catalog, compares the trade-offs and adds to your cart, and
          you can see every step it takes.
        </p>

        <form data-hero-fade className="mt-8 max-w-xl" onSubmit={onSubmit}>
          <label htmlFor="hero-prompt" className="sr-only">
            Tell Pip what you need
          </label>
          <div className="flex items-center gap-2 rounded-full bg-surface p-1.5 pl-5 hairline transition-shadow focus-within:shadow-[inset_0_0_0_1px_var(--accent-text),0_0_0_4px_color-mix(in_oklab,var(--accent)_15%,transparent)]">
            <input
              ref={inputRef}
              id="hero-prompt"
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tell Pip what you need…"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
            />
            <span ref={micRef} className="inline-flex">
              <button
                type="button"
                aria-label="Speak to Pip"
                className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Mic className="size-[18px]" />
              </button>
            </span>
            <span ref={sendRef} className="inline-flex">
              <button
                type="submit"
                aria-label="Send to Pip"
                className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg shadow-[0_8px_24px_-8px_var(--accent)] transition-[filter] hover:brightness-110"
              >
                <ArrowUp className="size-[18px]" />
              </button>
            </span>
          </div>
        </form>

        <ul data-hero-fade className="mt-4 flex max-w-xl flex-wrap gap-2" aria-label="Example requests">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                onClick={() => {
                  setPrompt(ex);
                  inputRef.current?.focus();
                }}
                className="inline-flex min-h-8 items-center rounded-full bg-surface px-3 py-1.5 text-xs text-muted transition-colors hairline hover:text-text"
                aria-label={`Use example: ${ex}`}
              >
                <span data-chip-text={ex}>{ex}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Pip's hero anchor: the fixed companion layer flies Pip from here into the dock on scroll. */}
      <div data-pip-anchor="hero" aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-[460px] lg:block" />
    </section>
  );
}
