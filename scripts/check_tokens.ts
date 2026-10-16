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
  "src/features/companion/PipCanvas.tsx",
  "src/features/companion/PipRenderer.tsx",
  "src/features/companion/PipScene.tsx",
  "src/features/companion/CompanionLayer.tsx",
  "src/features/companion/states.ts",
  // Single source of truth & generated files
  "src/tokens/definitions.ts",
  "src/styles/tokens.css",
  "src/styles/tokens.ts",
  // Global stylesheet containing base layer definitions
  "src/styles/globals.css",
];

const SCAN_DIRS = ["src/features", "src/components", "src/app", "src/styles", "src/lib"];

// Hex color regex: matches #abc, #aabbcc, #aabbccdd, bg-[#...], text-[#...]
const HEX_REGEX = /#(?:[0-9a-fA-F]{3,8})\b/;

// Arbitrary utility classes: w-[..], h-[..], min-/max-[..], gap-[..], p-[..], m-[..], inset-[..], grid-cols-[..], leading-[..], tracking-[..], text-[..], rounded-[..], etc.
const ARBITRARY_UTILITY_REGEX = /\b(?:w|h|size|min-w|min-h|max-w|max-h|gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|inset|inset-x|inset-y|top|bottom|left|right|grid-cols|grid-rows|col-span|row-span|leading|tracking|text|rounded)-\[[^\]]+\]/;

// rgb/rgba/hsl/hsla function calls
const RGB_HSL_REGEX = /\b(?:rgb|rgba|hsl|hsla)\s*\(/i;

// Hardcoded named color strings in inline style attributes or scripts
const INLINE_COLOR_REGEX = /\b(?:color|backgroundColor|borderColor|fill|stroke)\s*:\s*["'](?!var\(|currentColor|transparent|inherit|none)[a-zA-Z]{3,}["']/i;

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

    // Check arbitrary utility
    const utilMatch = lineText.match(ARBITRARY_UTILITY_REGEX);
    if (utilMatch && !lineText.includes("allowlist-token-ok")) {
      violations.push({
        file: relPath,
        line: lineNum,
        match: utilMatch[0],
        type: "arbitrary-utility",
      });
    }

    // Check rgb/rgba/hsl/hsla function call
    const rgbHslMatch = lineText.match(RGB_HSL_REGEX);
    if (rgbHslMatch && !lineText.includes("allowlist-token-ok")) {
      violations.push({
        file: relPath,
        line: lineNum,
        match: rgbHslMatch[0],
        type: "raw-rgb-hsl",
      });
    }

    // Check inline color literal
    const inlineMatch = lineText.match(INLINE_COLOR_REGEX);
    if (inlineMatch && !lineText.includes("allowlist-token-ok")) {
      violations.push({
        file: relPath,
        line: lineNum,
        match: inlineMatch[0],
        type: "inline-color",
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
