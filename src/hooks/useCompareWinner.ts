"use client";

import { useMemo } from "react";
import { getComparisonWinner, type CompareWinnerResult } from "@/lib/commerce/compareWinner";
import type { CompareKey } from "@/lib/commerce/compare";

export type { CompareWinnerResult };

/**
 * Hook extracting product comparison and winner calculation logic out of JSX.
 */
export function useCompareWinner(
  ids: string[],
  options?: {
    context?: string | null;
    priorities?: CompareKey[] | null;
  },
): CompareWinnerResult {
  const idsKey = ids.join(",");
  const prioritiesKey = options?.priorities?.join(",");
  const context = options?.context;

  return useMemo(
    () => getComparisonWinner(ids, { context, priorities: options?.priorities }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, context, prioritiesKey],
  );
}
