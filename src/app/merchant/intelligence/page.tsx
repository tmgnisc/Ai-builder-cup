import type { Metadata } from "next";
import { IntelligenceTab } from "@/features/merchant";

export const metadata: Metadata = { title: "Pip insights" };

export default function Page() {
  return <IntelligenceTab />;
}
