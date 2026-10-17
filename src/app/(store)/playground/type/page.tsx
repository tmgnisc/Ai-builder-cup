"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

interface FontCombo {
  id: string;
  name: string;
  role: string;
  displayFont: string;
  uiFont: string;
  monoFont: string;
  description: string;
}

const CANDIDATES: FontCombo[] = [
  {
    id: "candidate-a",
    name: "Direction A: Considered Editorial & High-Tech",
    role: "Target Persona Spec (Geist + Instrument Serif)",
    displayFont: "font-serif",
    uiFont: "font-sans",
    monoFont: "font-mono",
    description: "Instrument Serif for hero headlines; Geist Sans for UI chrome & catalog; Geist Mono with tabular figures for specs & NPR prices.",
  },
  {
    id: "candidate-b",
    name: "Direction B: Clean Neo-Grotesque Industrial",
    role: "System Baseline (Inter + Tabular Mono)",
    displayFont: "font-sans font-bold",
    uiFont: "font-sans",
    monoFont: "font-mono",
    description: "Inter across all display titles and UI body; Monospace tabular digits for specs, model codes, and NPR prices.",
  },
  {
    id: "candidate-c",
    name: "Direction C: Technical Hardware Direct",
    role: "Framework / Nothing Inspired",
    displayFont: "font-mono font-bold tracking-tight",
    uiFont: "font-sans",
    monoFont: "font-mono",
    description: "Technical monospace headings and spec labels; clean neutral sans for narrative paragraphs and helper text.",
  },
];

export default function TypographyBakeoffPage() {
  const [activeCombo, setActiveCombo] = useState<string>("candidate-a");
  const selected = CANDIDATES.find((c) => c.id === activeCombo) || CANDIDATES[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">Stage 1 Deliverable</span>
              <span className="text-xs text-muted">Persona Design System</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Typography Bake-off & Specimen</h1>
            <p className="mt-1 text-sm text-muted">
              Interactive evaluation of font combinations, type scale, tabular numerals, and Devanagari fallback readiness.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {CANDIDATES.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={activeCombo === c.id ? "primary" : "secondary"}
                onClick={() => setActiveCombo(c.id)}
              >
                {c.name.split(":")[0]}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Selected Direction Info */}
      <section className="mt-8 rounded-xl bg-surface-2 p-6 hairline">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <p className="text-xs font-medium text-accent-text">{selected.role}</p>
            <p className="mt-2 text-sm text-muted">{selected.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip>Display: {selected.displayFont}</Chip>
            <Chip>UI Body: {selected.uiFont}</Chip>
            <Chip>Specs &amp; Price: {selected.monoFont}</Chip>
          </div>
        </div>
      </section>

      {/* Hero Headline Specimen */}
      <section className="mt-12 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">1. Hero & Section Titles</h3>
        <div className="rounded-xl bg-surface p-8 hairline">
          <p className="text-xs text-muted">64px / 48px Display Scale</p>
          <h2 className={`mt-2 text-4xl sm:text-5xl lg:text-6xl tracking-tight ${selected.displayFont}`}>
            Agentic commerce. Direct advice.
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted">
            Autonomous shopping with verified catalog specs and real-time inventory. Tell Pip your workload, preferences, or budget — it evaluates trade-offs without sales talk.
          </p>
        </div>
      </section>

      {/* Type Scale Ladder */}
      <section className="mt-12 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">2. Complete Typographic Scale</h3>
        <Card className="divide-y divide-border p-0">
          <div className="p-4 sm:flex sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-muted">text-4xl (36px / 40px)</span>
            <span className="text-4xl font-bold tracking-tight">MacBook Pro 14 M4</span>
          </div>
          <div className="p-4 sm:flex sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-muted">text-2xl (24px / 32px)</span>
            <span className="text-2xl font-semibold tracking-tight">Compare Specifications</span>
          </div>
          <div className="p-4 sm:flex sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-muted">text-xl (20px / 28px)</span>
            <span className="text-xl font-medium">Verified Express &amp; Standard Delivery</span>
          </div>
          <div className="p-4 sm:flex sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-muted">text-base (16px / 24px)</span>
            <span className="text-base">Standard UI body text for descriptions and agent dialogue.</span>
          </div>
          <div className="p-4 sm:flex sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-muted">text-sm (14px / 20px)</span>
            <span className="text-sm text-muted">Secondary helper copy, metadata captions, and button labels.</span>
          </div>
          <div className="p-4 sm:flex sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-muted">text-xs (12px / 16px)</span>
            <span className="text-xs uppercase tracking-wider text-muted">Brand · Category · Stock Indicator</span>
          </div>
        </Card>
      </section>

      {/* Tabular Numerals & Price Formatting */}
      <section className="mt-12 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">3. Tabular Numerals &amp; Price Format</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <h4 className="text-sm font-semibold">Digit Grouping &amp; Alignment</h4>
            <div className="mt-4 space-y-3 font-mono text-lg font-semibold tabular">
              <div className="flex justify-between border-b border-border pb-1">
                <span className="text-sm font-normal text-muted">Budget Phone:</span>
                <span>NPR 38,500</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span className="text-sm font-normal text-muted">ANC Headphones:</span>
                <span>NPR 54,999</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span className="text-sm font-normal text-muted">Pro Laptop:</span>
                <span>NPR 2,89,999</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Tabular numerals ensure digit columns line up vertically without proportional font jitter during cart or price recalculations.
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="text-sm font-semibold">Typography Stack &amp; Fallbacks</h4>
            <div className="mt-4 space-y-3">
              <div className="border-b border-border pb-2">
                <p className="text-xs text-muted">Primary Interface Typeface</p>
                <p className="mt-1 text-lg font-medium">Inter / Geist Sans Clean Modern Stack</p>
                <p className="font-mono text-sm font-semibold">NPR 2,89,999 (Tabular Digits)</p>
              </div>
              <div className="pt-1">
                <p className="text-xs text-muted">Fallback System Stack</p>
                <code className="text-xs text-muted">
                  system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, sans-serif
                </code>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Product Specimen Card */}
      <section className="mt-12 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">4. Live Component Specimen (Product Card & Specs)</h3>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg bg-surface p-4 hairline">
            <div className="aspect-[4/3] rounded-md bg-surface-2 flex items-center justify-center text-xs text-muted">
              4:3 Studio Image
            </div>
            <p className="mt-3 text-xs text-muted">Apple</p>
            <h4 className="font-display text-base font-medium">MacBook Pro 14 M4 Pro</h4>
            <p className="mt-1 font-mono text-xs text-muted">24 GB · 22 h · 1.6 kg</p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="font-mono text-base font-semibold tabular">NPR 2,89,999</span>
              <Button size="sm" variant="primary">Add to cart</Button>
            </div>
          </div>

          <div className="rounded-lg bg-surface p-4 hairline">
            <div className="aspect-[4/3] rounded-md bg-surface-2 flex items-center justify-center text-xs text-muted">
              4:3 Studio Image
            </div>
            <p className="mt-3 text-xs text-muted">Sony</p>
            <h4 className="font-display text-base font-medium">WH-1000XM5</h4>
            <p className="mt-1 font-mono text-xs text-muted">30 h · ANC · 250 g</p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="font-mono text-base font-semibold tabular">NPR 54,999</span>
              <Button size="sm" variant="primary">Add to cart</Button>
            </div>
          </div>

          <div className="rounded-lg bg-surface p-4 hairline">
            <div className="aspect-[4/3] rounded-md bg-surface-2 flex items-center justify-center text-xs text-muted">
              4:3 Studio Image
            </div>
            <p className="mt-3 text-xs text-muted">Apple</p>
            <h4 className="font-display text-base font-medium">iPhone 16 Pro</h4>
            <p className="mt-1 font-mono text-xs text-muted">128 GB · 27 h · 199 g</p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="font-mono text-base font-semibold tabular">NPR 1,54,999</span>
              <Button size="sm" variant="primary">Add to cart</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
