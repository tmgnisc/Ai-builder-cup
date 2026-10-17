"use client";

import { Database } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { FRICTION, FUNNEL, KPIS, PERIOD } from "@/data/merchant";
import { getAllProducts } from "@/lib/commerce/catalog";
import { Funnel } from "./Funnel";
import { KpiCard } from "./KpiCard";
import { FrictionList, SessionPanel } from "./Lists";

export function OverviewTab() {
  const allProducts = getAllProducts();
  const inStockCount = allProducts.filter((p) => p.stock > 0).length;
  const lowStockCount = allProducts.filter((p) => p.stock > 0 && p.stock <= 3).length;

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
              {allProducts.length} catalog items loaded · {inStockCount} available for immediate fulfillment · {lowStockCount} on low-stock buffer.
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
          {KPIS.map((k) => (
            <KpiCard key={k.key} kpi={k} />
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
