import type { Metadata } from "next";
import { MerchantShell } from "@/features/merchant";

export const metadata: Metadata = {
  title: { default: "Merchant", template: "%s · Persona Merchant" },
  robots: { index: false, follow: false },
};

/** Merchant portal: its own shell, separate from the storefront layout in (store). */
export default function MerchantLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <MerchantShell>{children}</MerchantShell>;
}
