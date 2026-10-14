import type { Metadata } from "next";
import { MerchantDashboard } from "@/components/merchant/MerchantDashboard";

export const metadata: Metadata = { title: "Merchant" };

export default function MerchantPage() {
  return <MerchantDashboard />;
}
