import { cn } from "@/lib/cn";
import type { FunnelStep } from "@/data/merchant";

const fmt = (n: number) => n.toLocaleString("en-IN");
const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

/**
 * Assisted-shopping funnel (distinct shopper sessions per step). The first step (all visits) is
 * context; the bars start at "Talked to Pip" so the later steps stay readable.
 */
export function Funnel({ steps, period }: { steps: FunnelStep[]; period: string }) {
  const [visits, ...rest] = steps;
  const top = rest[0]?.value ?? 0;
  // Bars scale to the biggest step so they stay readable even before anyone has talked to Pip.
  const scale = Math.max(1, ...rest.map((s) => s.value));
  // The biggest step-to-step drop (lowest conversion) is where to look first; needs real traffic.
  let worst = -1;
  if (top > 0)
    for (let i = 1; i < rest.length; i++)
      if (worst === -1 || ratio(rest[i].value, rest[i - 1].value) < ratio(rest[worst].value, rest[worst - 1].value)) worst = i;

  return (
    <section aria-labelledby="funnel-h" className="rounded-card bg-surface p-5 hairline">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="funnel-h" className="font-display text-base font-semibold tracking-tight">
          Assisted funnel
        </h2>
        <p className="text-xs text-muted">
          {period} · {fmt(visits?.value ?? 0)} visits
          {visits?.value ? (
            <>
              {" "}
              · <span className="text-text tabular">{pct(ratio(top, visits.value))}</span> talked to Pip
            </>
          ) : null}
        </p>
      </div>
      <ol className="mt-5 space-y-2.5">
        {rest.map((s, i) => {
          const conv = i === 0 ? null : ratio(s.value, rest[i - 1].value);
          const isWorst = i === worst;
          return (
            <li key={s.key} className="grid funnel-grid-desktop items-center gap-3 max-sm:funnel-grid-mobile">
              <span className="text-sm leading-tight text-muted">{s.label}</span>
              <span className="relative flex h-9 items-center justify-center">
                <span
                  className={cn("block h-full rounded-lg", isWorst ? "bg-thinking/30 shadow-[inset_0_0_0_1px_var(--state-thinking)]" : "bg-accent/25 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_45%,transparent)]")}
                  style={{ width: `${Math.max(8, ratio(s.value, scale) * 100)}%` }}
                />
                <span className="absolute text-sm font-semibold tabular">{fmt(s.value)}</span>
              </span>
              <span className={cn("text-right text-xs tabular", isWorst ? "text-thinking" : "text-muted")}>
                {conv === null ? (top ? "100%" : "–") : rest[i - 1].value ? pct(conv) : "–"}
                {isWorst && <span className="block text-2xs font-medium">biggest drop</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-muted">Right column: share of the previous step that reached this one.</p>
    </section>
  );
}
