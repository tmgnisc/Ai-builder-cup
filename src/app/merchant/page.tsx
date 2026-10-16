import type { Metadata } from "next";
import { MerchantDashboard } from "@/features/merchant";

export const metadata: Metadata = { title: "Merchant" };

export default function MerchantPage() {
  return <MerchantDashboard />;
}
