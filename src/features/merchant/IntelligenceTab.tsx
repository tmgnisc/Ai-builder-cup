"use client";

import { AlertTriangle, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FRICTION, MISSING_INFO, TOP_QUESTIONS } from "@/data/merchant";
import { useMerchantSession } from "@/store/useMerchantSession";

export function IntelligenceTab() {
  const liveMissing = useMerchantSession((s) => s.missing);

  const combinedMissing = [
    ...MISSING_INFO,
    ...liveMissing.map((m) => ({
      productId: m.productId,
      field: m.field,
      asks: m.asks,
      example: m.example,
      isLive: true,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="rounded-xl bg-surface-2/60 p-4 hairline">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-text">
            <BrainCircuit className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-accent-text">
              Pip Conversational Intelligence
            </h2>
            <p className="text-xs text-muted">
              Live NLP analysis of customer shopping dialogues, unmapped spec questions, and checkout friction points.
            </p>
          </div>
        </div>
      </div>

      {/* Top Shopper Queries and Resolution Rate */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text">Top Customer Questions & Tasks</h3>
          <span className="text-2xs text-muted">Sorted by frequency</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TOP_QUESTIONS.map((q, idx) => (
            <Card key={idx} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-2xs font-medium uppercase tracking-wider text-muted hairline">
                    {q.intent}
                  </span>
                  <span className="font-mono text-xs font-semibold text-text">
                    {q.count} inquiries
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-text leading-snug">
                  &ldquo;{q.text}&rdquo;
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2 text-2xs">
                <span className="text-muted">Task Resolution Rate</span>
                <span className="font-mono font-semibold text-listening">
                  {Math.round(q.resolved * 100)}%
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Missing Information in Catalog */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text">Catalog Information Gaps</h3>
            <p className="text-2xs text-muted">
              Specs shoppers asked Pip for that our catalog schema lacks, causing Pip to respond honestly that data is unavailable.
            </p>
          </div>
          <Badge tone="warning">{combinedMissing.length} Gaps Identified</Badge>
        </div>

        <div className="overflow-hidden rounded-xl bg-surface/50 hairline">
          <table
            className="w-full border-collapse text-left text-xs"
            aria-label="Missing Product Information Ledger"
          >
            <thead>
              <tr className="border-b border-border/60 bg-surface-2/60 text-muted">
                <th scope="col" className="p-3 font-medium uppercase tracking-wider text-2xs">
                  Product ID
                </th>
                <th scope="col" className="p-3 font-medium uppercase tracking-wider text-2xs">
                  Missing Field
                </th>
                <th scope="col" className="p-3 font-medium uppercase tracking-wider text-2xs">
                  Shopper Asks
                </th>
                <th scope="col" className="p-3 font-medium uppercase tracking-wider text-2xs">
                  Sample Shopper Prompt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {combinedMissing.map((m, idx) => (
                <tr key={idx} className="transition-colors hover:bg-surface-2/30">
                  <td className="p-3 font-mono font-medium text-text whitespace-nowrap">
                    {m.productId}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded bg-searching/15 px-2 py-0.5 text-2xs font-medium text-searching">
                      <AlertTriangle className="size-2.5" aria-hidden="true" />
                      {m.field}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-semibold text-text whitespace-nowrap">
                    {m.asks}
                  </td>
                  <td className="p-3 text-muted italic">
                    &ldquo;{m.example}&rdquo;
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Friction Themes */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Shopper Hesitation Themes</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FRICTION.map((f, idx) => (
            <Card key={idx} className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  Page: {f.page}
                </span>
                <span className="font-mono text-xs font-bold text-searching">
                  {f.count} reports
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-text">
                &ldquo;{f.text}&rdquo;
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
