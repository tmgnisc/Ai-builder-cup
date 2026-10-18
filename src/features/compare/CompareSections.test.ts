import { describe, expect, it } from "vitest";
import { COMPARE_SECTIONS, groupRowsBySection } from "./CompareSections";
import type { CompareRow } from "@/lib/commerce/compare";

describe("CompareSections", () => {
  it("defines standard spec sections in priority order", () => {
    expect(COMPARE_SECTIONS.length).toBeGreaterThanOrEqual(5);
    const titles = COMPARE_SECTIONS.map((s) => s.title);
    expect(titles).toContain("Overview");
    expect(titles).toContain("Performance");
    expect(titles).toContain("Battery & Weight");
    expect(titles).toContain("Connectivity");
    expect(titles).toContain("Warranty & Support");
  });

  it("groups rows into appropriate sections", () => {
    const mockRows: CompareRow[] = [
      { key: "price", label: "Price", values: { a: "Rs. 100", b: "Rs. 200" }, winners: ["a"], numeric: true },
      { key: "ram", label: "Memory", values: { a: "16 GB", b: "32 GB" }, winners: ["b"], numeric: true },
      { key: "battery", label: "Battery", values: { a: "10 h", b: "12 h" }, winners: ["b"], numeric: true },
    ];

    const grouped = groupRowsBySection(mockRows);
    expect(grouped.length).toBe(3);
    expect(grouped[0].title).toBe("Overview");
    expect(grouped[0].rows).toHaveLength(1);
    expect(grouped[0].rows[0].key).toBe("price");

    expect(grouped[1].title).toBe("Performance");
    expect(grouped[1].rows).toHaveLength(1);
    expect(grouped[1].rows[0].key).toBe("ram");

    expect(grouped[2].title).toBe("Battery & Weight");
    expect(grouped[2].rows).toHaveLength(1);
    expect(grouped[2].rows[0].key).toBe("battery");
  });

  it("places unrecognized keys into an Other Specs section", () => {
    const mockRows: CompareRow[] = [
      { key: "price", label: "Price", values: { a: "10" }, winners: [], numeric: true },
      { key: "custom_key" as unknown as CompareRow["key"], label: "Custom Spec", values: { a: "Val" }, winners: [], numeric: false },
    ];

    const grouped = groupRowsBySection(mockRows);
    expect(grouped.length).toBe(2);
    expect(grouped[1].title).toBe("Other specs");
    expect(grouped[1].rows[0].label).toBe("Custom Spec");
  });

  it("omits empty sections", () => {
    const mockRows: CompareRow[] = [
      { key: "warranty", label: "Warranty", values: { a: "1 yr" }, winners: [], numeric: true },
    ];

    const grouped = groupRowsBySection(mockRows);
    expect(grouped.length).toBe(1);
    expect(grouped[0].title).toBe("Warranty & Support");
  });
});
