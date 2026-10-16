"use client";

import { useMemo } from "react";
import { qualifyDelivery, type DeliveryQualification } from "@/lib/commerce/deliveryQualification";

/**
 * React hook computing delivery qualification for a given order amount and target city.
 */
export function useDeliveryQualification(amount: number, city: string = "Kathmandu"): DeliveryQualification {
  return useMemo(() => qualifyDelivery(amount, city), [amount, city]);
}
