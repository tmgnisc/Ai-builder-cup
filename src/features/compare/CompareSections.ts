import type { CompareKey, TextKey, CompareRow } from "@/lib/commerce/compare";

export interface CompareSectionDef {
  id: string;
  title: string;
  keys: (CompareKey | TextKey)[];
}

export const COMPARE_SECTIONS: CompareSectionDef[] = [
  {
    id: "overview",
    title: "Overview",
    keys: ["price", "rating"],
  },
  {
    id: "performance",
    title: "Performance",
    keys: ["cpu", "gpu", "ram", "storage"],
  },
  {
    id: "battery-weight",
    title: "Battery & Weight",
    keys: ["battery", "weight"],
  },
  {
    id: "display-media",
    title: "Display & Media",
    keys: ["screen", "camera"],
  },
  {
    id: "connectivity",
    title: "Connectivity",
    keys: ["ports", "connectivity"],
  },
  {
    id: "warranty",
    title: "Warranty & Support",
    keys: ["warranty"],
  },
];

export interface GroupedCompareSection {
  id: string;
  title: string;
  rows: CompareRow[];
}

export function groupRowsBySection(rows: CompareRow[]): GroupedCompareSection[] {
  const rowMap = new Map<string, CompareRow>(rows.map((r) => [r.key, r]));
  const usedKeys = new Set<string>();
  const grouped: GroupedCompareSection[] = [];

  for (const section of COMPARE_SECTIONS) {
    const sectionRows: CompareRow[] = [];
    for (const key of section.keys) {
      const row = rowMap.get(key);
      if (row) {
        sectionRows.push(row);
        usedKeys.add(key);
      }
    }
    if (sectionRows.length > 0) {
      grouped.push({
        id: section.id,
        title: section.title,
        rows: sectionRows,
      });
    }
  }

  const leftoverRows = rows.filter((r) => !usedKeys.has(r.key));
  if (leftoverRows.length > 0) {
    grouped.push({
      id: "other",
      title: "Other Specs",
      rows: leftoverRows,
    });
  }

  return grouped;
}
