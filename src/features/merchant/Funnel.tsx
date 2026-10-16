import { cn } from "@/lib/cn";
import type { FunnelStep } from "@/data/merchant";

const fmt = (n: number) => n.toLocaleString("en-IN");
const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

/**
 * Assisted-shopping funnel. The first step (all visits) is shown as context, and the bars
 * start at "Talked to Pip" so the later steps stay readable; bar widths are linear.
 */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const [visits, ...rest] = steps;
  const top = rest[0].value;
  // The biggest step-to-step drop (lowest conversion) is where to look first.
  let worst = 1;
  for (let i = 2; i < rest.length; i++) if (rest[i].value / rest[i - 1].value < rest[worst].value / rest[worst - 1].value) worst = i;

  return (
    <section data-pip-anchor="merchant-funnel" data-pip-topic="merchant-funnel" aria-labelledby="funnel-h" className="rounded-card bg-surface p-5 hairline">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="funnel-h" className="font-display text-base font-semibold tracking-tight">
          Assisted funnel
        </h2>
        <p className="text-xs text-muted">
          {fmt(visits.value)} visits · <span className="text-text">{pct(top / visits.value)}</span> talked to Pip
        </p>
      </div>
      <ol className="mt-5 space-y-2.5">
        {rest.map((s, i) => {
          const conv = i === 0 ? null : s.value / rest[i - 1].value;
          const isWorst = i === worst;
          return (
            <li key={s.key} data-funnel-row className="grid funnel-grid-desktop items-center gap-3 max-sm:funnel-grid-mobile">
              <span className="text-sm leading-tight text-muted">{s.label}</span>
              <span className="relative flex h-9 items-center justify-center">
                <span
                  data-funnel-bar
                  className={cn("block h-full rounded-lg", isWorst ? "bg-thinking/30 shadow-[inset_0_0_0_1px_var(--state-thinking)]" : "bg-accent/25 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_45%,transparent)]")}
                  style={{ width: `${Math.max(6, (s.value / top) * 100)}%` }}
                />
                <span className="absolute font-mono text-sm font-semibold tabular">{fmt(s.value)}</span>
              </span>
              <span className={cn("text-right font-mono text-xs tabular", isWorst ? "text-thinking" : "text-muted")}>
                {conv === null ? "100%" : pct(conv)}
                {isWorst && <span className="block text-2xs font-sans font-medium">biggest drop</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-muted">Right column: share of the previous step that reached this one.</p>
    </section>
  );
}
