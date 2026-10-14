import type { Metadata } from "next";

export const metadata: Metadata = { title: "Merchant" };

/** Placeholder. The mocked dashboard ships in Phase 6. */
export default function MerchantPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Merchant dashboard</h1>
      <p className="mt-2 text-muted">Assisted-session KPIs, top questions and the funnel arrive in Phase 6.</p>
    </div>
  );
}
