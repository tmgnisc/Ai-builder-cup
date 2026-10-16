import fs from "node:fs";
import path from "node:path";

interface Violation {
  file: string;
  line: number;
  match: string;
  type: string;
}

const ALLOWLIST = [
  // Documented allowlist: Pip 3D Canvas internals and WebGL shader code
  "src/components/companion/PipCanvas.tsx",
  "src/components/companion/PipRenderer.tsx",
  "src/tokens/definitions.ts",
  "src/styles/tokens.css",
  "src/styles/tokens.ts",
];

const SCAN_DIRS = ["src/components", "src/app", "src/styles"];

// Hex color regex: matches #abc, #aabbcc, #aabbccdd, bg-[#...], text-[#...]
const HEX_REGEX = /#(?:[0-9a-fA-F]{3,8})\b/;

// Arbitrary pixel utility classes: text-[12px], rounded-[8px], size-[18px], h-[24px], etc.
const ARBITRARY_PX_REGEX = /\b(?:text|rounded|size|gap|p|px|py|pl|pr|pt|pb|m|mx|my|ml|mr|mt|mb|h|w|min-h|min-w|max-h|max-w|top|bottom|left|right|inset)-\[\d+px\]/;

function isAllowlisted(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  return ALLOWLIST.some((a) => norm.endsWith(a));
}

function scanFile(filePath: string): Violation[] {
  const relPath = path.relative(process.cwd(), filePath);
  if (isAllowlisted(relPath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    // Check hex
    const hexMatch = lineText.match(HEX_REGEX);
    if (hexMatch && !lineText.includes("allowlist-token-ok")) {
      violations.push({
        file: relPath,
        line: lineNum,
        match: hexMatch[0],
        type: "raw-hex",
      });
    }

    // Check arbitrary pixel
    const pxMatch = lineText.match(ARBITRARY_PX_REGEX);
    if (pxMatch && !lineText.includes("allowlist-token-ok")) {
      violations.push({
        file: relPath,
        line: lineNum,
        match: pxMatch[0],
        type: "arbitrary-pixel",
      });
    }
  });

  return violations;
}

function walk(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, fileList);
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      fileList.push(full);
    }
  }
  return fileList;
}

function main() {
  const files: string[] = [];
  for (const d of SCAN_DIRS) {
    walk(path.resolve(process.cwd(), d), files);
  }

  const allViolations: Violation[] = [];
  for (const f of files) {
    allViolations.push(...scanFile(f));
  }

  if (allViolations.length > 0) {
    console.error(`[check_tokens] Found ${allViolations.length} token violations:`);
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.line} [${v.type}] -> ${v.match}`);
    }
    if (process.argv.includes("--fail")) {
      process.exit(1);
    }
  } else {
    console.log("[check_tokens] ✓ No token violations found! Clean codebase.");
  }
}

main();
