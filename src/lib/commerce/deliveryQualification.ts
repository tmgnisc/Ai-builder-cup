import { deliveryFor, type DeliveryInfo } from "./delivery";
import { formatNPR } from "./format";

export interface DeliveryQualification {
  city: string;
  zone: "valley" | "outside";
  days: string;
  standardFee: number;
  effectiveFee: number;
  freeOver: number;
  qualifiesForFree: boolean;
  remainingForFree: number;
  formattedSummary: string;
}

/**
 * Calculates delivery qualification, fee, threshold, and remaining amount for free shipping.
 */
export function qualifyDelivery(amount: number, city: string = "Kathmandu"): DeliveryQualification {
  const info: DeliveryInfo = deliveryFor(city);
  const qualifies = amount >= info.freeOver;
  const remaining = qualifies ? 0 : Math.max(0, info.freeOver - amount);
  const effectiveFee = qualifies ? 0 : info.fee;

  const formattedSummary = qualifies
    ? `Free delivery to ${info.city} (${info.days})`
    : `${formatNPR(effectiveFee)} delivery to ${info.city} (${info.days}) · Free over ${formatNPR(info.freeOver)}`;

  return {
    city: info.city,
    zone: info.zone,
    days: info.days,
    standardFee: info.fee,
    effectiveFee,
    freeOver: info.freeOver,
    qualifiesForFree: qualifies,
    remainingForFree: remaining,
    formattedSummary,
  };
}
