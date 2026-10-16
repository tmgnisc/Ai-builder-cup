import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const baselineDir = path.resolve(process.cwd(), ".screenshots", "baseline");
const currentDir = path.resolve(process.cwd(), ".screenshots", "current");
const diffDir = path.resolve(process.cwd(), ".screenshots", "diff");

fs.mkdirSync(diffDir, { recursive: true });

function run() {
  if (!fs.existsSync(baselineDir) || !fs.existsSync(currentDir)) {
    console.error("Baseline or current screenshots directory missing!");
    process.exit(1);
  }

  const baselineFiles = fs.readdirSync(baselineDir).filter((f) => f.endsWith(".png"));
  let totalDiffPixels = 0;
  const reports: Array<{ file: string; diffPixels: number; diffPercent: string }> = [];

  for (const file of baselineFiles) {
    const baselinePath = path.join(baselineDir, file);
    const currentPath = path.join(currentDir, file);

    if (!fs.existsSync(currentPath)) {
      console.warn(`[WARN] Missing current screenshot for ${file}`);
      continue;
    }

    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(currentPath));

    const { width, height } = img1;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
      threshold: 0.1,
    });

    const diffPercent = ((numDiffPixels / (width * height)) * 100).toFixed(2);
    reports.push({ file, diffPixels: numDiffPixels, diffPercent: `${diffPercent}%` });
    totalDiffPixels += numDiffPixels;

    if (numDiffPixels > 0) {
      fs.writeFileSync(path.join(diffDir, file), PNG.sync.write(diff));
    }
  }

  console.table(reports);
  console.log(`Total diff pixels across all screenshots: ${totalDiffPixels}`);
  return { reports, totalDiffPixels };
}

run();
