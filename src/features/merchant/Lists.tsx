"use client";

import { ArrowUpRight, Boxes, CircleHelp, MessageSquareWarning, PackageSearch } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import type { FrictionTheme, MissingInfo, TopQuestion } from "@/data/merchant";
import type { MerchantKpis } from "@/store/useMerchantSession";

const INTENT_TONE: Record<string, BadgeTone> = { search: "info", compare: "accent", add: "success", delivery: "neutral", question: "warning" };

export function Panel({ id, title, icon, aside, children }: { id: string; title: string; icon: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="flex min-w-0 flex-col rounded-card bg-surface p-5 hairline">
      <div className="mb-4 flex items-center gap-2">
        <span aria-hidden className="text-muted">
          {icon}
        </span>
        <h2 id={`${id}-h`} className="flex-1 font-display text-base font-semibold tracking-tight">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Quiet placeholder for a panel with no data yet. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface-2/60 px-4 py-6 text-center text-sm leading-relaxed text-muted">{children}</p>;
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Bar behind a row, as wide as its share of the top row. */
const Meter = ({ share }: { share: number }) => (
  <span aria-hidden className="absolute inset-y-0 left-0 rounded-lg bg-surface-2" style={{ width: `${Math.max(4, share * 100)}%` }} />
);

export function QuestionsList({ items, loading }: { items: TopQuestion[]; loading?: boolean }) {
  const max = items[0]?.count || 1;
  return (
    <Panel id="merchant-questions" title="Top questions to Pip" icon={<CircleHelp className="size-4" />}>
      {loading ? (
        <PanelSkeleton />
      ) : items.length === 0 ? (
        <PanelEmpty>No questions yet this week. They appear here as shoppers talk to Pip.</PanelEmpty>
      ) : (
        <>
          <ol className="space-y-1.5">
            {items.map((q) => (
              <li key={q.text} className="relative overflow-hidden rounded-lg">
                <Meter share={q.count / max} />
                <div className="relative flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm" title={q.text}>
                    {q.text}
                  </span>
                  <Badge tone={INTENT_TONE[q.intent] ?? "neutral"} className="shrink-0 max-sm:hidden">
                    {q.intent}
                  </Badge>
                  <span className="w-10 shrink-0 text-right text-xs tabular">{q.count}</span>
                  <span className="w-12 shrink-0 text-right text-2xs text-muted tabular" title="Resolved">
                    {Math.round(q.resolved * 100)}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-2xs text-muted">Asks · share resolved (a verified add, comparison or checkout followed)</p>
        </>
      )}
    </Panel>
  );
}

export function MissingInfoList({ items, loading }: { items: MissingInfo[]; loading?: boolean }) {
  return (
    <Panel id="merchant-missing" title="Missing product info" icon={<PackageSearch className="size-4" />} aside={<span className="text-2xs text-muted">Pip had to say “not listed”</span>}>
      {loading ? (
        <PanelSkeleton />
      ) : items.length === 0 ? (
        <PanelEmpty>No gaps reported. When Pip can&apos;t answer a spec question from the catalog, it lands here.</PanelEmpty>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((m) => {
            const p = getProduct(m.productId);
            return (
              <li key={`${m.productId}-${m.field}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.field}</p>
                  <p className="truncate text-xs text-muted" title={m.example}>
                    “{m.example}”
                  </p>
                </div>
                {p && (
                  <Link href={`/product/${p.id}`} target="_blank" className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-surface-2 px-2.5 py-1 text-2xs text-muted hover:text-text max-sm:hidden">
                    {p.name}
                    <ArrowUpRight className="size-3" aria-hidden />
                  </Link>
                )}
                <span className="w-16 shrink-0 text-right text-xs tabular">
                  {m.asks}
                  <span className="text-muted"> {m.asks === 1 ? "ask" : "asks"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function FrictionList({ items, loading }: { items: FrictionTheme[]; loading?: boolean }) {
  const max = items[0]?.count || 1;
  return (
    <Panel id="merchant-friction" title="What's getting in the way" icon={<MessageSquareWarning className="size-4" />} aside={<span className="text-2xs text-muted">from Pip&apos;s check-ins</span>}>
      {loading ? (
        <PanelSkeleton rows={3} />
      ) : items.length === 0 ? (
        <PanelEmpty>No friction reported. Shoppers who answer Pip&apos;s “Something&apos;s confusing” check-in show up here.</PanelEmpty>
      ) : (
        <ol className="space-y-1.5">
          {items.map((f) => (
            <li key={f.text} className="relative overflow-hidden rounded-lg">
              <Meter share={f.count / max} />
              <div className="relative flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm" title={f.text}>
                  {f.text}
                </span>
                <span className="shrink-0 text-2xs text-muted max-sm:hidden">{f.page}</span>
                <span className="w-8 shrink-0 text-right text-xs tabular">{f.count}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** Stock and fulfilment straight from the database. */
export function StoreHealthPanel({ kpis, loading }: { kpis: MerchantKpis | null; loading?: boolean }) {
  const rows: [string, ReactNode, BadgeTone?][] = kpis
    ? [
        ["Products listed", kpis.totalProducts],
        ["In stock", kpis.inStockCount, "success"],
        ["Low stock (≤ 3)", kpis.lowStockCount, kpis.lowStockCount ? "warning" : undefined],
        ["Out of stock", kpis.totalProducts - kpis.inStockCount, kpis.totalProducts - kpis.inStockCount ? "danger" : undefined],
        ["Awaiting fulfilment", kpis.pendingFulfillment, kpis.pendingFulfillment ? "warning" : undefined],
        ["Orders, all time", kpis.totalOrders],
        ["Revenue, all time", formatNPR(kpis.totalRevenue)],
      ]
    : [];
  return (
    <Panel
      id="merchant-health"
      title="Store health"
      icon={<Boxes className="size-4" />}
      aside={
        <Link href="/merchant/inventory" className="text-2xs text-muted hover:text-text">
          Inventory →
        </Link>
      }
    >
      {loading || !kpis ? (
        <PanelSkeleton rows={6} />
      ) : (
        <dl className="divide-y divide-border">
          {rows.map(([label, value, tone]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-sm font-medium tabular">
                {tone ? (
                  <Badge tone={tone} className="tabular">
                    {value}
                  </Badge>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

/** Small headline number for a row of tiles (orders, insights). */
export function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "accent" | "warning" | "success" }) {
  return (
    <div className="rounded-card bg-surface p-4 hairline">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-1 font-display text-2xl font-semibold tracking-tight tabular ${tone === "accent" ? "text-accent-text" : tone === "warning" ? "text-thinking" : tone === "success" ? "text-listening" : ""}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}
