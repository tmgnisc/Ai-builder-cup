"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { useMerchantSession } from "@/store/useMerchantSession";
import { FrictionList, MissingInfoList, QuestionsList, StatTile } from "./Lists";
import { useLiveMerchantData } from "./OverviewTab";

export function IntelligenceTab() {
  const analytics = useMerchantSession((s) => s.analytics);
  const state = useMerchantSession((s) => s.analyticsState);
  const refresh = useLiveMerchantData();

  if (state === "error" && !analytics) {
    return <ErrorState title="Couldn't load Pip insights" message="The store backend didn't respond. Check that it's running, then try again." onRetry={refresh} />;
  }

  const loading = !analytics;
  const asks = analytics?.topQuestions.reduce((s, q) => s + q.count, 0) ?? 0;
  const gaps = analytics?.missingInfo.length ?? 0;
  const cart = analytics?.cartActions;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">{analytics?.period ?? "Last 7 days"} · questions are grouped when shoppers word them the same way.</p>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Questions in the top list" value={loading ? "–" : asks.toLocaleString("en-IN")} hint="Messages shoppers sent Pip" />
        <StatTile label="Catalog gaps" value={loading ? "–" : gaps} hint="Specs Pip couldn't answer" />
        <StatTile
          label="Cart writes caught"
          value={loading || !cart ? "–" : cart.caught}
          hint={cart ? `of ${cart.total} cart changes didn't stick; Pip said so` : "Cart changes that failed verification"}
        />
      </dl>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <QuestionsList items={analytics?.topQuestions ?? []} loading={loading} />
        <MissingInfoList items={analytics?.missingInfo ?? []} loading={loading} />
      </div>

      <FrictionList items={analytics?.frictionThemes ?? []} loading={loading} />
    </div>
  );
}
