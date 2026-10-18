"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Kpi } from "@/data/merchant";
import { useMerchantSession } from "@/store/useMerchantSession";
import { Funnel } from "./Funnel";
import { KpiCard } from "./KpiCard";
import { FrictionList, StoreHealthPanel } from "./Lists";

const REFRESH_MS = 30_000;

/** Loads KPIs + analytics now and every 30s while the page is open and visible. */
export function useLiveMerchantData() {
  const loadKpis = useMerchantSession((s) => s.loadKpisFromApi);
  const loadAnalytics = useMerchantSession((s) => s.loadAnalytics);
  useEffect(() => {
    const load = () => {
      if (document.visibilityState === "visible") {
        void loadKpis();
        void loadAnalytics();
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [loadKpis, loadAnalytics]);
  return () => {
    void loadKpis();
    void loadAnalytics();
  };
}

export function OverviewTab() {
  const kpis = useMerchantSession((s) => s.kpis);
  const kpisState = useMerchantSession((s) => s.kpisState);
  const analytics = useMerchantSession((s) => s.analytics);
  const analyticsState = useMerchantSession((s) => s.analyticsState);
  const refresh = useLiveMerchantData();

  if ((kpisState === "error" && !kpis) || (analyticsState === "error" && !analytics)) {
    return <ErrorState title="Couldn't load the dashboard" message="The store backend didn't respond. Check that it's running, then try again." onRetry={refresh} />;
  }

  const byKey = Object.fromEntries((analytics?.kpis ?? []).map((k) => [k.key, k]));
  const orders7d = kpis?.ordersTrend.reduce((a, b) => a + b, 0) ?? 0;
  const cards: Kpi[] =
    kpis && analytics
      ? [
          {
            key: "revenue",
            label: "Revenue",
            value: kpis.revenueTrend.reduce((a, b) => a + b, 0),
            format: "npr" as const,
            delta: kpis.revenueDelta,
            hint: `${orders7d} ${orders7d === 1 ? "order" : "orders"} this week, cancellations excluded`,
            trend: kpis.revenueTrend,
          },
          byKey.assisted,
          byKey.completion,
          byKey.verified,
        ].filter((k): k is Kpi => !!k)
      : [];
  const quiet = analytics?.totalEvents === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {analytics?.period ?? "Last 7 days"} · compared with the 7 days before · refreshes every 30 seconds
        </p>
        <Button size="sm" variant="ghost" onClick={refresh} iconLeft={<RefreshCw className="size-3.5" aria-hidden />}>
          Refresh
        </Button>
      </div>

      {quiet && (
        <p className="rounded-card bg-surface-2/60 px-5 py-4 text-sm text-muted hairline">
          No shopper activity in the last 7 days yet. These numbers fill in as people browse the store and talk to Pip.
        </p>
      )}

      <section aria-labelledby="kpi-h">
        <h2 id="kpi-h" className="sr-only">
          Key numbers
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.length
            ? cards.map((k) => <KpiCard key={k.key} kpi={k} />)
            : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-card" />)}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:merchant-dashboard-grid">
        {analytics ? <Funnel steps={analytics.funnel} period={analytics.period} /> : <Skeleton className="h-96 rounded-card" />}
        <StoreHealthPanel kpis={kpis} loading={!kpis} />
      </div>

      <FrictionList items={analytics?.frictionThemes ?? []} loading={!analytics} />
    </div>
  );
}
