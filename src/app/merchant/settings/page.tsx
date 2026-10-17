import type { Metadata } from "next";
import { SettingsTab } from "@/features/merchant";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsTab />;
}
