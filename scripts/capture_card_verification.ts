import { chromium } from "playwright";
import * as path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const outDir = "C:\\Users\\Imsudip\\.gemini\\antigravity\\brain\\7b3e9984-70a7-4cd6-b972-34fe555f3886";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // 1. Desktop Light - Headphones category
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 950 },
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/?category=headphones`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "light";
        localStorage.setItem("persona-prefs", JSON.stringify({ state: { theme: "light" }, version: 0 }));
      });
      await page.waitForTimeout(300);

      const storeSection = page.locator("#store");
      if (await storeSection.count() > 0) {
        await storeSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }
      await page.screenshot({
        path: path.join(outDir, "catalog_headphones_desktop_light.png"),
        fullPage: false,
      });
      console.log("Captured catalog_headphones_desktop_light.png");
      await context.close();
    }

    // 2. Desktop Dark - Headphones category
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 950 },
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/?category=headphones`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      // Ensure dark mode
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "dark";
        localStorage.setItem("persona-prefs", JSON.stringify({ state: { theme: "dark" }, version: 0 }));
      });
      await page.waitForTimeout(300);

      const storeSection = page.locator("#store");
      if (await storeSection.count() > 0) {
        await storeSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }
      await page.screenshot({
        path: path.join(outDir, "catalog_headphones_desktop_dark.png"),
        fullPage: false,
      });
      console.log("Captured catalog_headphones_desktop_dark.png");
      await context.close();
    }

    // 3. Mobile Light - Headphones category
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/?category=headphones`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "light";
        localStorage.setItem("persona-prefs", JSON.stringify({ state: { theme: "light" }, version: 0 }));
      });
      await page.waitForTimeout(300);

      const storeSection = page.locator("#store");
      if (await storeSection.count() > 0) {
        await storeSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }
      await page.screenshot({
        path: path.join(outDir, "catalog_headphones_mobile_light.png"),
        fullPage: false,
      });
      console.log("Captured catalog_headphones_mobile_light.png");
      await context.close();
    }

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
