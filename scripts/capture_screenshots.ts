import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2] || "baseline";
const outputDir = path.resolve(process.cwd(), ".screenshots", target);
fs.mkdirSync(outputDir, { recursive: true });

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const THEMES = ["dark", "light"] as const;

async function run() {
  console.log(`[capture_screenshots] Capturing ${target} to ${outputDir} against ${baseUrl}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
      });
      const page = await context.newPage();

      const preparePage = async (url: string) => {
        try {
          await page.goto(`${baseUrl}${url}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
        } catch {
          await page.goto(`${baseUrl}${url}`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
        }
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
          try {
            localStorage.setItem("persona:prefs", JSON.stringify({ state: { theme: t } }));
          } catch {}
          // Pause CSS transitions/animations for visual stability
          const style = document.createElement("style");
          style.innerHTML = "* { animation-play-state: paused !important; }";
          document.head.appendChild(style);
        }, theme);
        await page.waitForTimeout(600);
      };

      // 1. Home
      console.log(`Capturing home (${vp.name}, ${theme})...`);
      await preparePage("/");
      await page.screenshot({ path: path.join(outputDir, `home_${vp.name}_${theme}.png`), fullPage: false });

      // 2. Product
      console.log(`Capturing product (${vp.name}, ${theme})...`);
      await preparePage("/product/lenovo-ideapad-slim-5-14");
      await page.screenshot({ path: path.join(outputDir, `product_${vp.name}_${theme}.png`), fullPage: false });

      // 3. Cart Drawer
      console.log(`Capturing cart drawer (${vp.name}, ${theme})...`);
      await preparePage("/");
      const cartBtn = page.locator("#cart-button");
      if (await cartBtn.count()) {
        await cartBtn.click({ force: true });
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: path.join(outputDir, `cart_drawer_${vp.name}_${theme}.png`), fullPage: false });

      // 4. Compare Drawer
      console.log(`Capturing compare drawer (${vp.name}, ${theme})...`);
      await preparePage("/");
      // Click compare on first two products
      const compareButtons = page.locator("button[title='Compare']");
      const count = await compareButtons.count();
      if (count >= 2) {
        await compareButtons.nth(0).click({ force: true });
        await page.waitForTimeout(300);
        await compareButtons.nth(1).click({ force: true });
        await page.waitForTimeout(500);
        // Click compare tray open button
        const openCompare = page.locator("button:has-text('Compare 2')");
        if (await openCompare.count()) {
          await openCompare.click({ force: true, timeout: 5000 });
          await page.waitForTimeout(600);
        }
      }
      await page.screenshot({ path: path.join(outputDir, `compare_drawer_${vp.name}_${theme}.png`), fullPage: false });

      // 5. Merchant
      console.log(`Capturing merchant (${vp.name}, ${theme})...`);
      await preparePage("/merchant");
      await page.screenshot({ path: path.join(outputDir, `merchant_${vp.name}_${theme}.png`), fullPage: false });

      await context.close();
    }
  }

  await browser.close();
  console.log(`[capture_screenshots] Finished capturing ${target}!`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
