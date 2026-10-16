import { getProduct } from "./catalog";
import { compareProducts, type CompareKey, type CompareResult } from "./compare";
import type { Product } from "./schemas";

export interface CompareWinnerResult {
  products: Product[];
  result: CompareResult | null;
  winner: Product | null;
  winnerId: string | null;
  isWinner: (id: string) => boolean;
  isRowWinner: (rowKey: string, id: string) => boolean;
  verdict: string;
}

/**
 * Pure function computing comparison results and winner status from product IDs.
 */
export function getComparisonWinner(
  ids: string[],
  options?: {
    context?: string | null;
    priorities?: CompareKey[] | null;
  },
): CompareWinnerResult {
  const products = ids.map(getProduct).filter((p): p is Product => !!p);

  if (products.length < 2) {
    return {
      products,
      result: null,
      winner: null,
      winnerId: null,
      isWinner: () => false,
      isRowWinner: () => false,
      verdict: "",
    };
  }

  const result = compareProducts(products, {
    context: options?.context ?? undefined,
    priorities: options?.priorities ?? undefined,
  });

  const winner = result?.winnerId ? products.find((p) => p.id === result.winnerId) ?? null : null;

  return {
    products,
    result,
    winner,
    winnerId: result?.winnerId ?? null,
    isWinner: (id: string) => result?.winnerId === id,
    isRowWinner: (rowKey: string, id: string) => {
      const row = result.rows.find((r) => r.key === rowKey);
      return row ? row.winners.includes(id) : false;
    },
    verdict: result?.verdict ?? "",
  };
}
