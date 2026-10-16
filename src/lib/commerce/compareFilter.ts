import type { CompareRow } from "./compare";

/**
 * Checks whether a comparison row has differences across the products.
 * For numeric rows: non-empty winners indicates one or more products held an advantage.
 * For text rows: checks if formatted string values differ.
 */
export function isRowDifferent(row: CompareRow): boolean {
  if (row.numeric) {
    return row.winners.length > 0;
  }
  const vals = Object.values(row.values);
  if (vals.length <= 1) return false;
  const first = vals[0];
  return vals.some((v) => v !== first);
}

/**
 * Filters rows based on the "show differences only" toggle.
 */
export function filterDifferentRows(rows: CompareRow[], differencesOnly: boolean): CompareRow[] {
  if (!differencesOnly) return rows;
  return rows.filter(isRowDifferent);
}
