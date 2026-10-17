import { chromium, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const artifactDir = "C:\\Users\\Imsudip\\.gemini\\antigravity\\brain\\7b3e9984-70a7-4cd6-b972-34fe555f3886\\full_page_screens";
fs.mkdirSync(artifactDir, { recursive: true });

const VIEWPORTS = [
  { name: "desktop_1280", width: 1280, height: 800 },
  { name: "mobile_390", width: 390, height: 844 },
];

const THEMES = ["dark", "light"] as const;

interface ScreenSpec {
  id: string;
  url: string;
  prepare?: (page: Page) => Promise<void>;
}

const SCREENS: ScreenSpec[] = [
  { id: "home", url: "/" },
  { id: "category", url: "/?category=headphones#store" },
  { id: "product", url: "/product/lenovo-ideapad-slim-5-14" },
  { id: "compare", url: "/compare?ids=apple-macbook-pro-14-m4-pro,lenovo-ideapad-slim-5-14" },
  {
    id: "cart",
    url: "/",
    prepare: async (page: Page) => {
      // Add product to cart and open cart drawer
      const addButtons = page.locator("button[aria-label*='Add'][aria-label*='to cart']");
      if ((await addButtons.count()) > 0) {
        await addButtons.first().click().catch(() => {});
        await page.waitForTimeout(600);
      }
      const cartToggle = page.locator("button[aria-label*='Cart'], button[aria-label*='cart']");
      if ((await cartToggle.count()) > 0) {
        await cartToggle.first().click().catch(() => {});
        await page.waitForTimeout(600);
      }
    },
  },
  { id: "merchant", url: "/merchant" },
];

async function main() {
  console.log(`[capture_full_page_suite] Starting full-page screenshot capture against ${baseUrl}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const perfMetrics: Record<string, { fcp: number; lcp: number; cls: number }> = {};

  try {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
        });
        const page = await context.newPage();

        for (const screen of SCREENS) {
          const targetUrl = `${baseUrl}${screen.url}`;
          console.log(`Capturing ${screen.id} (${vp.name}, ${theme})...`);

          try {
            await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
            await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
          } catch {
            await page.goto(targetUrl, { waitUntil: "load", timeout: 20000 }).catch(() => {});
          }

          // Apply theme cleanly
          await page.evaluate((t) => {
            document.documentElement.dataset.theme = t;
            try {
              localStorage.setItem("persona-prefs", JSON.stringify({ state: { theme: t }, version: 0 }));
            } catch {}
          }, theme);
          await page.waitForTimeout(500);

          if (screen.prepare) {
            await screen.prepare(page);
          }

          // Scroll down and back up to trigger GSAP scroll reveals
          await page.evaluate(async () => {
            window.scrollTo(0, document.body.scrollHeight / 2);
            await new Promise((r) => setTimeout(r, 150));
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise((r) => setTimeout(r, 150));
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(300);

          const filename = `${screen.id}_${vp.name}_${theme}.png`;
          const filePath = path.join(artifactDir, filename);

          // Full page screenshot
          await page.screenshot({
            path: filePath,
            fullPage: screen.id !== "cart", // Cart is an overlay drawer; fullPage can clip absolute drawer overlays
          });

          // Measure Core Web Vitals on Home desktop
          if (screen.id === "home" && vp.name === "desktop_1280" && theme === "light") {
            const vitals = await page.evaluate(() => {
              const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
              const paint = performance.getEntriesByType("paint");
              const fcpEntry = paint.find((e) => e.name === "first-contentful-paint");
              return {
                ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
                domReady: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
                fcp: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
              };
            });
            console.log("Performance metrics for Home:", vitals);
          }
        }

        await context.close();
      }
    }
    console.log("All full-page screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture suite failed:", err);
  process.exit(1);
});
