import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Kpi } from "@/data/merchant";
import { formatNPR } from "@/lib/commerce/format";

export function formatKpi(value: number, format: Kpi["format"]): string {
  if (format === "npr") return formatNPR(Math.round(value));
  return format === "pct" ? `${value % 1 ? value.toFixed(1) : value}%` : Math.round(value).toLocaleString("en-IN");
}

/** One headline number with its weekly change and a 7-day sparkline. */
export function KpiCard({ kpi }: { kpi: Kpi }) {
  const flat = kpi.delta === 0;
  const up = kpi.delta > 0;
  const unit = kpi.format === "pct" ? " pts" : "%";
  return (
    <article data-kpi className="flex flex-col justify-between gap-4 rounded-card bg-surface p-5 hairline">
      <div>
        <h3 className="text-sm text-muted">{kpi.label}</h3>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular">{formatKpi(kpi.value, kpi.format)}</p>
        <p className="mt-1.5 text-xs leading-snug text-muted">{kpi.hint}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-2xs font-semibold tabular",
            flat ? "bg-surface-2 text-muted" : up ? "bg-listening/12 text-listening" : "bg-danger/12 text-danger",
          )}
        >
          {flat ? <Minus className="size-3" aria-hidden /> : up ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
          {flat ? "No change" : `${up ? "+" : ""}${kpi.delta}${unit}`}
          <span className="sr-only"> vs the previous 7 days</span>
        </span>
        <Sparkline values={kpi.trend} label={`${kpi.label}, daily trend`} />
      </div>
    </article>
  );
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const W = 96;
  const H = 32;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - min) / span) * (H - 6)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className="overflow-visible">
      <polygon points={`0,${H} ${line} ${W},${H}`} className="fill-accent/10" />
      <polyline points={line} fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="stroke-accent-text" />
      <circle cx={lx} cy={ly} r={2.5} className="fill-accent-text" />
    </svg>
  );
}
