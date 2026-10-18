/**
 * Merchant analytics shapes. The values come from the backend, which aggregates them from
 * shopper telemetry (src/lib/telemetry.ts → backend/app/services/analytics.py).
 */

export interface Kpi {
  key: string;
  label: string;
  value: number;
  format: "int" | "pct" | "npr";
  /** Change vs the previous 7 days (points for pct KPIs, % otherwise). 0 when there is no baseline. */
  delta: number;
  hint: string;
  /** Daily values, oldest first, for the sparkline. */
  trend: number[];
}

export interface TopQuestion {
  text: string;
  count: number;
  intent: string;
  /** Share of these conversations that ended with the shopper's task done. */
  resolved: number;
}

export interface MissingInfo {
  productId: string;
  field: string;
  asks: number;
  example: string;
}

export interface FrictionTheme {
  text: string;
  count: number;
  page: string;
}

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
}

export interface CartActions {
  total: number;
  verified: number;
  caught: number;
}

/** GET /api/merchant/analytics: computed by the backend from shopper telemetry. */
export interface MerchantAnalytics {
  period: string;
  totalEvents: number;
  kpis: Kpi[];
  cartActions: CartActions;
  funnel: FunnelStep[];
  topQuestions: TopQuestion[];
  frictionThemes: FrictionTheme[];
  missingInfo: (MissingInfo & { lastAskedAt?: string })[];
}
