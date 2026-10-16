import { describe, expect, it } from "vitest";
import { isRowDifferent, filterDifferentRows } from "./compareFilter";
import type { CompareRow } from "./compare";

describe("compareFilter", () => {
  const diffNumeric: CompareRow = {
    key: "battery",
    label: "Battery",
    values: { a: "12 h", b: "10 h" },
    winners: ["a"],
    numeric: true,
  };

  const sameNumeric: CompareRow = {
    key: "ram",
    label: "Memory",
    values: { a: "16 GB", b: "16 GB" },
    winners: [],
    numeric: true,
  };

  const diffText: CompareRow = {
    key: "cpu",
    label: "Processor",
    values: { a: "Ryzen 7", b: "Core Ultra 7" },
    winners: [],
    numeric: false,
  };

  const sameText: CompareRow = {
    key: "ports",
    label: "Ports",
    values: { a: "2x USB-C", b: "2x USB-C" },
    winners: [],
    numeric: false,
  };

  it("identifies differences in numeric rows via winners", () => {
    expect(isRowDifferent(diffNumeric)).toBe(true);
    expect(isRowDifferent(sameNumeric)).toBe(false);
  });

  it("identifies differences in text rows by comparing values", () => {
    expect(isRowDifferent(diffText)).toBe(true);
    expect(isRowDifferent(sameText)).toBe(false);
  });

  it("filters rows when differencesOnly is true", () => {
    const rows = [diffNumeric, sameNumeric, diffText, sameText];
    const filtered = filterDifferentRows(rows, true);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((r) => r.key)).toEqual(["battery", "cpu"]);
  });

  it("returns all rows when differencesOnly is false", () => {
    const rows = [diffNumeric, sameNumeric, diffText, sameText];
    const unfiltered = filterDifferentRows(rows, false);
    expect(unfiltered).toHaveLength(4);
  });
});
