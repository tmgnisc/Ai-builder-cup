"use client";

import { useEffect } from "react";
import { Database } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { FRICTION, FUNNEL, PERIOD } from "@/data/merchant";
import { getAllProducts } from "@/lib/commerce/catalog";
import { useMerchantSession } from "@/store/useMerchantSession";
import { Funnel } from "./Funnel";
import { KpiCard } from "./KpiCard";
import { FrictionList, SessionPanel } from "./Lists";

export function OverviewTab() {
  const kpis = useMerchantSession((s) => s.kpis);
  const loadKpisFromApi = useMerchantSession((s) => s.loadKpisFromApi);

  useEffect(() => {
    loadKpisFromApi();
  }, [loadKpisFromApi]);

  const allProducts = getAllProducts();
  const totalProducts = kpis?.totalProducts ?? allProducts.length;
  const inStockCount = kpis?.inStockCount ?? allProducts.filter((p) => p.stock > 0).length;
  const lowStockCount = kpis?.lowStockCount ?? allProducts.filter((p) => p.stock > 0 && p.stock <= 3).length;

  const liveKpiItems = [
    {
      key: "verified" as const,
      label: "Total Store Revenue",
      value: kpis?.totalRevenue ?? 654000,
      format: "npr" as const,
      delta: 14,
      hint: `${kpis?.totalOrders ?? 6} customer orders recorded across Kathmandu Valley`,
      trend: [78000, 94000, 112000, 105000, 128000, 142000, 155000],
    },
    {
      key: "verified" as const,
      label: "Cart Actions Verified",
      value: kpis?.verifiedPercentage ?? 98.6,
      format: "pct" as const,
      delta: 0.8,
      hint: `${kpis?.verifiedOrdersCount ?? 5} of ${kpis?.totalOrders ?? 6} orders confirmed by Pip live stock check`,
      trend: [97, 98, 97, 99, 98, 100, 99],
    },
    {
      key: "completion" as const,
      label: "Catalog In-Stock Health",
      value: Math.round(((kpis?.inStockCount ?? inStockCount) / Math.max(1, (kpis?.totalProducts ?? totalProducts))) * 100),
      format: "pct" as const,
      delta: 4,
      hint: `${kpis?.inStockCount ?? inStockCount} of ${kpis?.totalProducts ?? totalProducts} products ready for dispatch`,
      trend: [86, 88, 89, 91, 90, 92, 93],
    },
    {
      key: "assisted" as const,
      label: "Assisted Shopper Sessions",
      value: kpis?.assistedSessions ?? 1284,
      format: "int" as const,
      delta: 18,
      hint: `${kpis?.taskCompletionRate ?? 71}% conversation task completion rate`,
      trend: [142, 158, 171, 166, 189, 214, 244],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Store Real-Time Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/60 p-4 hairline">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-listening/15 text-listening">
            <Database className="size-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text">
                Live Store Synchronization
              </span>
              <span className="inline-flex items-center gap-1 text-2xs text-listening font-medium">
                <span className="size-1.5 rounded-full bg-listening animate-pulse" aria-hidden="true" />
                Active (Port 8080)
              </span>
            </div>
            <p className="text-xs text-muted">
              {totalProducts} catalog items loaded · {inStockCount} available for immediate fulfillment · {lowStockCount} on low-stock buffer.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{PERIOD}</Badge>
          <Badge tone="success">Verified Pip Telemetry</Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-text">Operational Key Performance Indicators</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {liveKpiItems.map((k, idx) => (
            <KpiCard key={idx} kpi={k} />
          ))}
        </div>
      </div>

      {/* Conversion Funnel and Live Browser Session Telemetry */}
      <div className="grid grid-cols-1 gap-4 lg:merchant-dashboard-grid">
        <Funnel steps={FUNNEL} />
        <SessionPanel />
      </div>

      {/* Friction Theme Analysis */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-text">Shopper Friction & Clarity Feedback</h2>
        <div className="mt-3">
          <FrictionList items={FRICTION} />
        </div>
      </div>
    </div>
  );
}
