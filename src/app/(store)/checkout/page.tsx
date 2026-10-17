import type { Metadata } from "next";
import { CheckoutView } from "@/features/checkout";

export const metadata: Metadata = { title: "Checkout" };

/** Review & confirm. Pip can bring the user here but can never place the order. */
export default function CheckoutPage() {
  return <CheckoutView />;
}
