import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const target = process.argv[2] || "baseline";
const outputDir = path.resolve(process.cwd(), ".screenshots", target);
fs.mkdirSync(outputDir, { recursive: true });

const baseUrl = process.env.BASE_URL || "http://localhost:3001";

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
      // Open compare drawer with first two products
      await page.evaluate(() => {
        (window as unknown as Record<string, { getState: () => { show: (ids: string[]) => void } }>).__useCompare?.getState().show(["lenovo-ideapad-slim-5-14", "acer-swift-go-14"]);
      });
      await page.waitForSelector("[role='dialog']", { state: "visible", timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, `compare_drawer_${vp.name}_${theme}.png`), fullPage: false });

      // 4b. Tour bubble over drawer
      console.log(`Capturing tour over drawer (${vp.name}, ${theme})...`);
      await page.evaluate(() => {
        (window as unknown as Record<string, () => void>).__offerTour?.();
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outputDir, `tour_over_drawer_${vp.name}_${theme}.png`), fullPage: false });

      // 5. Merchant
      console.log(`Capturing merchant (${vp.name}, ${theme})...`);
      await preparePage("/merchant");
      await page.screenshot({ path: path.join(outputDir, `merchant_${vp.name}_${theme}.png`), fullPage: false });

      // 6. Compare Workspace - 2 products
      console.log(`Capturing compare workspace 2-products (${vp.name}, ${theme})...`);
      await preparePage("/compare?ids=lenovo-ideapad-slim-5-14,acer-swift-go-14");
      await page.screenshot({ path: path.join(outputDir, `compare_workspace_2col_${vp.name}_${theme}.png`), fullPage: false });

      // 7. Compare Workspace - 4 products
      console.log(`Capturing compare workspace 4-products (${vp.name}, ${theme})...`);
      await preparePage("/compare?ids=lenovo-ideapad-slim-5-14,acer-swift-go-14,apple-macbook-pro-14-m4-pro,hp-pavilion-plus-14");
      await page.screenshot({ path: path.join(outputDir, `compare_workspace_4col_${vp.name}_${theme}.png`), fullPage: false });

      // 7b. Compare Workspace - Pip Bubble Open
      console.log(`Capturing compare workspace Pip bubble open (${vp.name}, ${theme})...`);
      await page.evaluate(() => {
        const bubble = (window as unknown as Record<string, { getState: () => { show: (content: unknown, opts?: unknown) => void } }>).__useBubble;
        bubble?.getState().show({
          kind: "prompt",
          suggestions: ["Show differences", "Which has better battery?", "Add winner to cart"],
        }, { input: true });
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outputDir, `compare_workspace_pip_bubble_${vp.name}_${theme}.png`), fullPage: false });

      // 7c. Compare Workspace - Pip Parked (verifying Pip never covers table, summary, or controls)
      console.log(`Capturing compare workspace Pip parked (${vp.name}, ${theme})...`);
      await page.evaluate(() => {
        const bubble = (window as unknown as Record<string, { getState: () => { close: (reason: string) => void } }>).__useBubble;
        bubble?.getState().close("user");
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outputDir, `compare_workspace_pip_parked_${vp.name}_${theme}.png`), fullPage: false });

      // 8. Compare Workspace - Cross-Category
      console.log(`Capturing compare workspace cross-category (${vp.name}, ${theme})...`);
      await preparePage("/compare?ids=lenovo-ideapad-slim-5-14,sony-wh-1000xm5");
      await page.screenshot({ path: path.join(outputDir, `compare_workspace_crosscat_${vp.name}_${theme}.png`), fullPage: false });

      // 9. Compare Workspace - Out of Stock Winner
      console.log(`Capturing compare workspace OOS winner (${vp.name}, ${theme})...`);
      await preparePage("/compare?ids=lenovo-thinkpad-e14-g6,hp-pavilion-plus-14");
      await page.screenshot({ path: path.join(outputDir, `compare_workspace_oos_winner_${vp.name}_${theme}.png`), fullPage: false });

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
