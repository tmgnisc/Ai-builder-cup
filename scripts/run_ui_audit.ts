import fs from "node:fs";
import path from "node:path";

interface AuditResult {
  spacings: Map<string, number>;
  offScaleSpacings: string[];
  radii: Map<string, number>;
  typeScale: Map<string, number>;
  fontWeights: Map<string, number>;
  fontFamilies: Map<string, number>;
  lineHeights: Map<string, number>;
  trackings: Map<string, number>;
  buttons: Map<string, number>;
  zIndices: Map<string, number>;
  iconSizes: Map<string, number>;
  iconLibraries: Map<string, number>;
  cardStyles: Array<{ name: string; file: string; classes: string }>;
  inputStyles: Array<{ name: string; file: string; classes: string }>;
  tableStyles: Array<{ name: string; file: string; classes: string }>;
  statusBadges: Array<{ name: string; file: string; classes: string }>;
}

const audit: AuditResult = {
  spacings: new Map(),
  offScaleSpacings: [],
  radii: new Map(),
  typeScale: new Map(),
  fontWeights: new Map(),
  fontFamilies: new Map(),
  lineHeights: new Map(),
  trackings: new Map(),
  buttons: new Map(),
  zIndices: new Map(),
  iconSizes: new Map(),
  iconLibraries: new Map(),
  cardStyles: [],
  inputStyles: [],
  tableStyles: [],
  statusBadges: [],
};

const STANDARD_SPACINGS = new Set([
  "0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96", "auto", "px"
]);

function walk(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        walk(filePath, fileList);
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".css")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk(path.resolve(process.cwd(), "src"));

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, "/");

  // Icon imports check
  if (content.includes("lucide-react")) {
    const count = (audit.iconLibraries.get("lucide-react") || 0) + 1;
    audit.iconLibraries.set("lucide-react", count);
  }
  if (content.includes("@phosphor-icons")) {
    const count = (audit.iconLibraries.get("@phosphor-icons") || 0) + 1;
    audit.iconLibraries.set("@phosphor-icons", count);
  }

  // Card detection
  if (relPath.includes("Card") || relPath.includes("Item")) {
    const cardMatch = content.match(/className=["']([^"']*(?:border|surface|bg-|shadow|rounded)[^"']*)["']/g);
    if (cardMatch) {
      cardMatch.forEach((m) => {
        const cls = m.replace(/className=["']|["']/g, "");
        if (cls.includes("rounded") && (cls.includes("surface") || cls.includes("border") || cls.includes("bg-"))) {
          audit.cardStyles.push({ name: path.basename(file), file: relPath, classes: cls });
        }
      });
    }
  }

  // Input detection
  if (content.includes("<input") || relPath.includes("Input") || relPath.includes("Search") || relPath.includes("checkout")) {
    const inputMatch = content.match(/<input[^>]*className=["']([^"']+)["']/g);
    if (inputMatch) {
      inputMatch.forEach((m) => {
        const cls = m.replace(/.*className=["']|["'].*/g, "");
        audit.inputStyles.push({ name: path.basename(file), file: relPath, classes: cls });
      });
    }
  }

  // Table detection
  if (content.includes("<table") || relPath.includes("Table") || relPath.includes("CompareWorkspace")) {
    const tableMatch = content.match(/<(?:table|th|td|tr)[^>]*className=["']([^"']+)["']/g);
    if (tableMatch) {
      tableMatch.forEach((m) => {
        const cls = m.replace(/.*className=["']|["'].*/g, "");
        audit.tableStyles.push({ name: path.basename(file), file: relPath, classes: cls });
      });
    }
  }

  // Status badges
  if (content.includes("in-stock") || content.includes("In Stock") || content.includes("StatusBadge") || content.includes("best-value") || content.includes("Low Stock")) {
    const badgeMatch = content.match(/className=["']([^"']*(?:badge|status|stock|emerald|amber|red|state-|accent)[^"']*)["']/gi);
    if (badgeMatch) {
      badgeMatch.forEach((m) => {
        const cls = m.replace(/className=["']|["']/g, "");
        audit.statusBadges.push({ name: path.basename(file), file: relPath, classes: cls });
      });
    }
  }

  // Class extraction
  const classMatches = content.matchAll(/className=["'`]([^"'`]+)["'`]/g);
  for (const match of classMatches) {
    const classStr = match[1];
    const tokens = classStr.split(/\s+/).filter(Boolean);

    for (const t of tokens) {
      // Spacing: p-, m-, gap-, space-
      const spaceMatch = t.match(/^(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-([a-z0-9.-]+)$/);
      if (spaceMatch) {
        const val = spaceMatch[1];
        audit.spacings.set(val, (audit.spacings.get(val) || 0) + 1);
        if (!STANDARD_SPACINGS.has(val) && !val.startsWith("(") && !val.includes("var")) {
          audit.offScaleSpacings.push(`${t} in ${relPath}`);
        }
      }

      // Radius: rounded-
      if (t.startsWith("rounded")) {
        audit.radii.set(t, (audit.radii.get(t) || 0) + 1);
      }

      // Typography
      if (t.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|display|h1|h2|h3|body|caption)$/)) {
        audit.typeScale.set(t, (audit.typeScale.get(t) || 0) + 1);
      }
      if (t.match(/^font-(sans|mono|display|inter|light|normal|medium|semibold|bold)$/)) {
        if (t.match(/^font-(light|normal|medium|semibold|bold)$/)) {
          audit.fontWeights.set(t, (audit.fontWeights.get(t) || 0) + 1);
        } else {
          audit.fontFamilies.set(t, (audit.fontFamilies.get(t) || 0) + 1);
        }
      }
      if (t.match(/^leading-/)) {
        audit.lineHeights.set(t, (audit.lineHeights.get(t) || 0) + 1);
      }
      if (t.match(/^tracking-/)) {
        audit.trackings.set(t, (audit.trackings.get(t) || 0) + 1);
      }

      // Z-Index
      if (t.startsWith("z-")) {
        audit.zIndices.set(t, (audit.zIndices.get(t) || 0) + 1);
      }

      // Icon sizes
      if (t.match(/^(?:size|w|h)-(3|3\.5|4|5|6|7|8|10|12)$/)) {
        audit.iconSizes.set(t, (audit.iconSizes.get(t) || 0) + 1);
      }
    }
  }
}

console.log(JSON.stringify({
  spacings: Object.fromEntries(Array.from(audit.spacings.entries()).sort((a,b) => b[1] - a[1])),
  offScaleSpacings: Array.from(new Set(audit.offScaleSpacings)),
  radii: Object.fromEntries(Array.from(audit.radii.entries()).sort((a,b) => b[1] - a[1])),
  typeScale: Object.fromEntries(Array.from(audit.typeScale.entries()).sort((a,b) => b[1] - a[1])),
  fontWeights: Object.fromEntries(Array.from(audit.fontWeights.entries()).sort((a,b) => b[1] - a[1])),
  fontFamilies: Object.fromEntries(Array.from(audit.fontFamilies.entries()).sort((a,b) => b[1] - a[1])),
  lineHeights: Object.fromEntries(Array.from(audit.lineHeights.entries()).sort((a,b) => b[1] - a[1])),
  trackings: Object.fromEntries(Array.from(audit.trackings.entries()).sort((a,b) => b[1] - a[1])),
  zIndices: Object.fromEntries(Array.from(audit.zIndices.entries()).sort((a,b) => b[1] - a[1])),
  iconSizes: Object.fromEntries(Array.from(audit.iconSizes.entries()).sort((a,b) => b[1] - a[1])),
  iconLibraries: Object.fromEntries(audit.iconLibraries.entries()),
  sampleCardStyles: audit.cardStyles.slice(0, 5),
  sampleInputStyles: audit.inputStyles.slice(0, 5),
  sampleTableStyles: audit.tableStyles.slice(0, 5),
  sampleStatusBadges: audit.statusBadges.slice(0, 5),
}, null, 2));
