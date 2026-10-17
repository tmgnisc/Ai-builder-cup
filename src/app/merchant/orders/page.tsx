import type { Metadata } from "next";
import { OrdersTab } from "@/features/merchant";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersTab />;
}
