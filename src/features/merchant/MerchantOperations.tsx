"use client";

import {
  Boxes,
  BrainCircuit,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/config/brand";
import { useMerchantSession } from "@/store/useMerchantSession";
import { IntelligenceTab } from "./IntelligenceTab";
import { InventoryTab } from "./InventoryTab";
import { OrdersTab } from "./OrdersTab";
import { OverviewTab } from "./OverviewTab";
import { SettingsTab } from "./SettingsTab";

interface MerchantOperationsProps {
  onLogout: () => void;
}

export type MerchantTab = "overview" | "inventory" | "orders" | "intelligence" | "settings";

export function MerchantOperations({ onLogout }: MerchantOperationsProps) {
  const [activeTab, setActiveTab] = useState<MerchantTab>("overview");
  const user = useMerchantSession((s) => s.user);

  const tabs: Array<{ id: MerchantTab; label: string; icon: React.ReactNode }> = [
    {
      id: "overview",
      label: "Overview & Analytics",
      icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
    },
    {
      id: "inventory",
      label: "Catalog & Inventory",
      icon: <Boxes className="size-4" aria-hidden="true" />,
    },
    {
      id: "orders",
      label: "Verified Orders",
      icon: <ShoppingBag className="size-4" aria-hidden="true" />,
    },
    {
      id: "intelligence",
      label: "Pip Intelligence",
      icon: <BrainCircuit className="size-4" aria-hidden="true" />,
    },
    {
      id: "settings",
      label: "Store Settings",
      icon: <Settings className="size-4" aria-hidden="true" />,
    },
  ];

  return (
    <div className="mx-auto max-w-page px-4 pb-20 pt-6 sm:px-6">
      {/* Top Merchant Workspace Bar */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-accent-text hairline">
            <Store className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-semibold uppercase tracking-wider text-accent-text">
                {BRAND.name} Operations
              </span>
              <span className="inline-flex items-center gap-1 text-2xs text-listening font-medium">
                <span className="size-1.5 rounded-full bg-listening animate-pulse" aria-hidden="true" />
                Live Sync
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-text">
              Store Operations Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-medium text-text">
              {user?.name || "Operations Lead"}
            </span>
            <span className="text-2xs text-muted">
              {user?.email || "admin@persona.store"}
            </span>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={onLogout}
            iconLeft={<LogOut className="size-3.5 text-muted" aria-hidden="true" />}
            className="text-xs"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Tabs Subnavigation */}
      <nav
        aria-label="Merchant Operations Sections"
        className="mb-6 flex overflow-x-auto rounded-xl bg-surface-2/60 p-1 hairline gap-1"
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-surface text-text shadow-sm hairline"
                  : "text-muted hover:text-text hover:bg-surface-2"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={isActive ? "text-accent-text" : "text-muted"} aria-hidden="true">
                {t.icon}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Tab Content */}
      <main>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "inventory" && <InventoryTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "intelligence" && <IntelligenceTab />}
        {activeTab === "settings" && <SettingsTab onLogout={onLogout} />}
      </main>
    </div>
  );
}
