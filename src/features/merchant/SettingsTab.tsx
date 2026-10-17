"use client";

import { LogOut, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { BRAND } from "@/config/brand";

interface SettingsTabProps {
  onLogout: () => void;
}

export function SettingsTab({ onLogout }: SettingsTabProps) {
  const [pipAutonomous, setPipAutonomous] = useState(true);
  const [strictVerification, setStrictVerification] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState("3");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Store Identity */}
      <Card className="p-5">
        <h3 className="font-display text-sm font-semibold text-text">Store Identity & Configuration</h3>
        <p className="mt-0.5 text-xs text-muted">
          Operational metadata for this merchant portal instance.
        </p>

        <div className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-muted mb-1">
              Store Brand
            </label>
            <Input value={BRAND.name} readOnly disabled className="bg-surface-2 text-text font-medium" />
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-muted mb-1">
              Store Facility Name
            </label>
            <Input defaultValue="Persona Flagship Operations" className="text-text font-medium" />
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-muted mb-1">
              Administrator Email
            </label>
            <Input defaultValue="admin@persona.store" readOnly disabled className="bg-surface-2 text-text font-medium" />
          </div>
        </div>
      </Card>

      {/* Pip Agent Policies */}
      <Card className="p-5">
        <h3 className="font-display text-sm font-semibold text-text">Pip Agent & Cart Integrity Rules</h3>
        <p className="mt-0.5 text-xs text-muted">
          Configure how Pip validates stock before cart mutations.
        </p>

        <div className="mt-4 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text">Mandatory Live Stock Verification</p>
              <p className="text-2xs text-muted">
                Pip calls get_cart and backend stock API before confirming cart additions to shoppers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={strictVerification}
              onChange={(e) => setStrictVerification(e.target.checked)}
              className="size-4 rounded border-border-strong text-accent focus:ring-accent"
              aria-label="Toggle Mandatory Live Stock Verification"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <div>
              <p className="font-medium text-text">Proactive Shopper Guidance</p>
              <p className="text-2xs text-muted">
                Allows Pip to offer comparative context and low-stock alerts on product cards.
              </p>
            </div>
            <input
              type="checkbox"
              checked={pipAutonomous}
              onChange={(e) => setPipAutonomous(e.target.checked)}
              className="size-4 rounded border-border-strong text-accent focus:ring-accent"
              aria-label="Toggle Proactive Shopper Guidance"
            />
          </div>

          <div className="border-t border-border/40 pt-3">
            <label htmlFor="low-stock-threshold" className="block text-2xs font-semibold uppercase tracking-wider text-muted mb-1">
              Low-Stock Alert Threshold (Units)
            </label>
            <div className="max-w-xs">
              <Input
                id="low-stock-threshold"
                type="number"
                min="1"
                max="20"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <p className="mt-1 text-2xs text-muted">
              Products with stock at or below this number show an amber &ldquo;Low Stock&rdquo; indicator to shoppers and merchants.
            </p>
          </div>
        </div>
      </Card>

      {/* Save Settings */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={onLogout}
          iconLeft={<LogOut className="size-4 text-danger" aria-hidden="true" />}
          className="text-xs text-danger hover:bg-danger/10"
        >
          Sign Out of Store
        </Button>

        <Button
          variant="primary"
          onClick={handleSave}
          iconLeft={<Save className="size-4" aria-hidden="true" />}
        >
          {saved ? "Saved Successfully" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
