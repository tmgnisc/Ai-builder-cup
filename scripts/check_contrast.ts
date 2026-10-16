import { tokenDefinitions } from "../src/tokens/definitions";

interface ColorPair {
  name: string;
  fg: string;
  bg: string;
  minRatio: number;
  level: "AA" | "AAA" | "Component";
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(ratio * 100) / 100;
}

export const PAIRS: ColorPair[] = [
  // Light Mode Pairs
  { name: "Light: text on bg", fg: "#181716", bg: "#FBFBFA", minRatio: 4.5, level: "AA" },
  { name: "Light: text on surface", fg: "#181716", bg: "#FFFFFF", minRatio: 4.5, level: "AA" },
  { name: "Light: muted on bg", fg: "#64625C", bg: "#FBFBFA", minRatio: 4.5, level: "AA" },
  { name: "Light: muted on surface", fg: "#64625C", bg: "#FFFFFF", minRatio: 4.5, level: "AA" },
  { name: "Light: muted on surface2", fg: "#64625C", bg: "#F3F2EE", minRatio: 4.5, level: "AA" },
  { name: "Light: darkened accent on bg", fg: "#AF4404", bg: "#FBFBFA", minRatio: 4.5, level: "AA" },
  { name: "Light: white text on darkened accent button", fg: "#FFFFFF", bg: "#AF4404", minRatio: 4.5, level: "AA" },
  { name: "Light: darkened warning on bg", fg: "#8A4C00", bg: "#FBFBFA", minRatio: 4.5, level: "AA" },
  { name: "Light: success on bg", fg: "#1A6E2E", bg: "#FBFBFA", minRatio: 4.5, level: "AA" },
  { name: "Light: danger on bg", fg: "#B31B18", bg: "#FBFBFA", minRatio: 4.5, level: "AA" },
  { name: "Light: border on bg (UI)", fg: "#8F8C84", bg: "#FBFBFA", minRatio: 3.0, level: "Component" },

  // Dark Mode Pairs
  { name: "Dark: text on bg", fg: "#F5F4F0", bg: "#121211", minRatio: 4.5, level: "AA" },
  { name: "Dark: text on surface", fg: "#F5F4F0", bg: "#1A1918", minRatio: 4.5, level: "AA" },
  { name: "Dark: muted on bg", fg: "#A29F96", bg: "#121211", minRatio: 4.5, level: "AA" },
  { name: "Dark: muted on surface", fg: "#A29F96", bg: "#1A1918", minRatio: 4.5, level: "AA" },
  { name: "Dark: muted on surface2", fg: "#A29F96", bg: "#242321", minRatio: 4.5, level: "AA" },
  { name: "Dark: accent on bg", fg: "#F59E6C", bg: "#121211", minRatio: 4.5, level: "AA" },
  { name: "Dark: dark text on accent button", fg: "#121211", bg: "#E06D2B", minRatio: 4.5, level: "AA" },
  { name: "Dark: warning on bg", fg: "#F5A623", bg: "#121211", minRatio: 4.5, level: "AA" },
  { name: "Dark: success on bg", fg: "#34C759", bg: "#121211", minRatio: 4.5, level: "AA" },
  { name: "Dark: danger on bg", fg: "#FF453A", bg: "#121211", minRatio: 4.5, level: "AA" },
  { name: "Dark: border on bg (UI)", fg: "#64615B", bg: "#121211", minRatio: 3.0, level: "Component" },
];

export function runContrastCheck(): { ok: boolean; markdownTable: string; failures: string[] } {
  const failures: string[] = [];
  const lines: string[] = [
    "| Color Pair | Foreground | Background | Ratio | Requirement | Status |",
    "| :--- | :--- | :--- | :--- | :--- | :--- |",
  ];

  for (const pair of PAIRS) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    const pass = ratio >= pair.minRatio;
    const status = pass ? "✓ PASS" : "✕ FAIL";
    if (!pass) {
      failures.push(`${pair.name}: ${ratio}:1 is below ${pair.minRatio}:1`);
    }
    lines.push(
      `| ${pair.name} | \`${pair.fg}\` | \`${pair.bg}\` | **${ratio.toFixed(2)} : 1** | ${pair.minRatio}:1 (${pair.level}) | ${status} |`,
    );
  }

  return {
    ok: failures.length === 0,
    markdownTable: lines.join("\n"),
    failures,
  };
}

if (require.main === module || process.argv[1]?.endsWith("check_contrast.ts")) {
  const { ok, markdownTable, failures } = runContrastCheck();
  console.log("\n### Contrast Ratio Verification Table (WCAG 2.1 AA)\n");
  console.log(markdownTable);
  console.log("");
  if (!ok) {
    console.error("FAIL: The following color pairs failed contrast requirements:");
    for (const f of failures) console.error(" - " + f);
    process.exit(1);
  } else {
    console.log("✓ All 22 color pairs pass WCAG 2.1 AA requirements!");
    process.exit(0);
  }
}
