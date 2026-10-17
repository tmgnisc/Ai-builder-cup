import type { Metadata } from "next";
import { OverviewTab } from "@/features/merchant";

export const metadata: Metadata = { title: "Overview" };

export default function MerchantOverviewPage() {
  return <OverviewTab />;
}
