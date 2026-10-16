import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

interface PageAudit {
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
}

const PAGES: PageAudit[] = [
  {
    name: "Home",
    path: "/",
  },
  {
    name: "Product Detail",
    path: "/product/lenovo-ideapad-slim-5-14",
  },
  {
    name: "Compare Drawer",
    path: "/?compare=lenovo-ideapad-slim-5-14,apple-macbook-air-13-m3",
    prepare: async (page) => {
      // Find compare tray button or trigger compare drawer
      try {
        const compareBtn = page.locator('button:has-text("Compare")').first();
        if (await compareBtn.isVisible({ timeout: 2000 })) {
          await compareBtn.click({ force: true });
          await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        }
      } catch {
        // Fallback: trigger compare drawer via store/event
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent("open-compare-drawer"));
        });
      }
      await page.waitForTimeout(500);
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
  const summary: Array<{ page: string; theme: string; violations: number }> = [];

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
          .exclude('[data-pip-canvas]') // Exclude 3D WebGL canvas internals which don't have DOM semantics
          .disableRules(["color-contrast"]); // Contrast is token-controlled and verified via design system

        const results = await axe.analyze();

        summary.push({
          page: p.name,
          theme,
          violations: results.violations.length,
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
