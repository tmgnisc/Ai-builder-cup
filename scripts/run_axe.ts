import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3001";
const reportsDir = path.resolve(process.cwd(), ".axe-reports");
fs.mkdirSync(reportsDir, { recursive: true });

interface PageAudit {
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
}

const PAGES: PageAudit[] = [
  {
    name: "Home",
    path: "/",
    prepare: async (page) => {
      // Ensure Pip tour bubble is open during home audit
      await page.evaluate(() => {
        (window as unknown as Record<string, () => void>).__offerTour?.();
      });
      await page.waitForTimeout(500);
    },
  },
  {
    name: "Product Detail",
    path: "/product/lenovo-ideapad-slim-5-14",
  },
  {
    name: "Compare Drawer",
    path: "/",
    prepare: async (page) => {
      // Open compare drawer and Pip bubble over drawer
      await page.evaluate(() => {
        (window as unknown as Record<string, { getState: () => { show: (ids: string[]) => void } }>).__useCompare?.getState().show(["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]);
        (window as unknown as Record<string, () => void>).__offerTour?.();
      });
      await page.waitForSelector("[role='dialog']", { state: "visible", timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);
    },
  },
  {
    name: "Cart Drawer",
    path: "/",
    prepare: async (page) => {
      const cartBtn = page.locator("#cart-button");
      if (await cartBtn.count()) {
        await cartBtn.click({ force: true });
        await page.waitForSelector("[role='dialog']", { state: "visible", timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    },
  },
  {
    name: "Merchant",
    path: "/merchant",
  },
];

async function run() {
  console.log(`[run_axe] Starting axe accessibility audit against ${baseUrl}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  let totalViolations = 0;
  const summary: Array<{
    page: string;
    theme: string;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    total: number;
  }> = [];

  try {
    for (const theme of ["dark", "light"] as const) {
      for (const p of PAGES) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          colorScheme: theme,
        });
        const page = await context.newPage();

        try {
          await page.goto(`${baseUrl}${p.path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
        } catch {
          await page.goto(`${baseUrl}${p.path}`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
        }

        // Apply theme
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
          try {
            localStorage.setItem("persona:prefs", JSON.stringify({ state: { theme: t } }));
          } catch {}
        }, theme);
        await page.waitForTimeout(400);

        if (p.prepare) {
          await p.prepare(page);
        }

        const axe = new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .exclude("[data-pip-canvas]"); // Exclude 3D WebGL canvas internals which don't have DOM semantics

        const results = await axe.analyze();

        // Save raw JSON result
        const jsonFileName = `${p.name.replace(/\s+/g, "_").toLowerCase()}_${theme}.json`;
        fs.writeFileSync(path.join(reportsDir, jsonFileName), JSON.stringify(results, null, 2), "utf-8");

        const counts = {
          critical: results.violations.filter((v) => v.impact === "critical").length,
          serious: results.violations.filter((v) => v.impact === "serious").length,
          moderate: results.violations.filter((v) => v.impact === "moderate").length,
          minor: results.violations.filter((v) => v.impact === "minor").length,
        };

        summary.push({
          page: p.name,
          theme,
          critical: counts.critical,
          serious: counts.serious,
          moderate: counts.moderate,
          minor: counts.minor,
          total: results.violations.length,
        });

        if (results.violations.length > 0) {
          console.error(`\n[FAIL] Accessibility violations on ${p.name} (${theme}):`);
          for (const v of results.violations) {
            console.error(`  - [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
            console.error(`    Help: ${v.helpUrl}`);
            for (const node of v.nodes) {
              console.error(`    Target: ${node.target.join(" ")}`);
              console.error(`    HTML: ${node.html}`);
            }
          }
          totalViolations += results.violations.length;
        } else {
          console.log(`[PASS] ${p.name} (${theme}): 0 violations`);
        }

        await context.close();
      }
    }

    console.log("\n--- Axe Audit Summary ---");
    console.table(summary);

    if (totalViolations > 0) {
      console.error(`\nTotal accessibility violations: ${totalViolations}`);
      process.exit(1);
    } else {
      console.log("\nAll pages passed accessibility audit with 0 violations!");
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
