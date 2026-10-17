import type { Metadata } from "next";
import { InventoryTab } from "@/features/merchant";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return <InventoryTab />;
}
