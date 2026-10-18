import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Kpi } from "@/data/merchant";

export function formatKpi(value: number, format: Kpi["format"] | "npr" | "currency"): string {
  if (format === "npr" || format === "currency") {
    return `NPR ${Math.round(value).toLocaleString("en-IN")}`;
  }
  return format === "pct" ? `${value % 1 ? value.toFixed(1) : value}%` : Math.round(value).toLocaleString("en-IN");
}

/** One headline number with its weekly change and a 7-day sparkline. */
export function KpiCard({ kpi }: { kpi: Kpi }) {
  const up = kpi.delta >= 0;
  const unit = kpi.format === "pct" ? " pts" : "%";
  return (
    <article data-pip-anchor={`kpi:${kpi.key}`} data-pip-topic="merchant-kpi" data-kpi className="flex flex-col justify-between gap-4 rounded-card bg-surface p-5 hairline">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">{kpi.label}</h3>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular">
          <span data-count={kpi.value} data-format={kpi.format}>
            {formatKpi(kpi.value, kpi.format)}
          </span>
        </p>
        <p className="mt-1.5 text-xs leading-snug text-muted">{kpi.hint}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-2xs font-semibold", up ? "bg-listening/12 text-listening" : "bg-danger/12 text-danger")}>
          {up ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
          {up ? "+" : ""}
          {kpi.delta}
          {unit}
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
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - min) / span) * (H - 6)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className="overflow-visible">
      <polygon points={`0,${H} ${line} ${W},${H}`} className="fill-accent/10" />
      <polyline data-spark points={line} fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="stroke-accent-text" pathLength={1} />
      <circle cx={lx} cy={ly} r={2.5} className="fill-accent-text" />
    </svg>
  );
}
