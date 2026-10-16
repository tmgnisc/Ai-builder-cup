import { getProduct } from "./catalog";
import type { Product } from "./schemas";
import { MAX_COMPARE } from "./compare";

export interface CompareUrlValidationResult {
  validIds: string[];
  products: Product[];
  droppedUnknown: string[];
  droppedDuplicates: string[];
  hasRedirect: boolean;
  redirectUrl: string | null;
  message: string | null;
}

/**
 * Validates compare query parameter (e.g. ?ids=macbook-pro-16,thinkpad-x1-carbon-gen-11).
 * Deduplicates, verifies existence in the catalog, enforces 2–4 limit,
 * and flags redirection if fewer than 2 valid products remain.
 */
export function parseAndValidateCompareIds(rawIds: string | string[] | undefined | null): CompareUrlValidationResult {
  if (!rawIds) {
    return {
      validIds: [],
      products: [],
      droppedUnknown: [],
      droppedDuplicates: [],
      hasRedirect: true,
      redirectUrl: "/",
      message: "No products selected for comparison.",
    };
  }

  const rawList = Array.isArray(rawIds)
    ? rawIds.flatMap((s) => s.split(","))
    : rawIds.split(",");

  const cleaned = rawList.map((s) => s.trim().toLowerCase()).filter(Boolean);

  const seen = new Set<string>();
  const uniqueList: string[] = [];
  const droppedDuplicates: string[] = [];

  for (const id of cleaned) {
    if (seen.has(id)) {
      droppedDuplicates.push(id);
    } else {
      seen.add(id);
      uniqueList.push(id);
    }
  }

  const validProducts: Product[] = [];
  const validIds: string[] = [];
  const droppedUnknown: string[] = [];

  for (const id of uniqueList) {
    const p = getProduct(id);
    if (p) {
      if (validIds.length < MAX_COMPARE) {
        validIds.push(id);
        validProducts.push(p);
      }
    } else {
      droppedUnknown.push(id);
    }
  }

  const hasFewerThan2 = validIds.length < 2;
  let message: string | null = null;
  if (droppedUnknown.length > 0) {
    message = `Unrecognized product${droppedUnknown.length > 1 ? "s" : ""} dropped: ${droppedUnknown.join(", ")}.`;
  }
  if (hasFewerThan2) {
    message = message
      ? `${message} At least 2 products are required to compare. Redirecting to store...`
      : "At least 2 products are required to compare. Redirecting to store...";
  }

  return {
    validIds,
    products: validProducts,
    droppedUnknown,
    droppedDuplicates,
    hasRedirect: hasFewerThan2,
    redirectUrl: hasFewerThan2 ? "/" : null,
    message,
  };
}

export function buildCompareUrl(ids: string[]): string {
  return `/compare?ids=${ids.join(",")}`;
}
