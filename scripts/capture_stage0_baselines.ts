import { chromium, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), ".screenshots/baseline");

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  const setTheme = async (page: Page, theme: "dark" | "light") => {
    await page.evaluate((t: string) => {
      document.documentElement.dataset.theme = t;
      localStorage.setItem("persona-prefs", JSON.stringify({ state: { theme: t }, version: 0 }));
    }, theme);
    await page.waitForTimeout(300);
  };

  console.log(`[capture] Taking baseline screenshots against ${BASE_URL}...`);

  // 1. Playground (Desktop Light & Dark)
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE_URL}/playground/heroui`, { waitUntil: "networkidle" });
    
    // Light
    await setTheme(page, "light");
    await page.screenshot({ path: path.join(OUT_DIR, "playground_heroui_desktop_light.png"), fullPage: true });
    console.log("✓ playground_heroui_desktop_light.png");

    // Dark
    await setTheme(page, "dark");
    await page.screenshot({ path: path.join(OUT_DIR, "playground_heroui_desktop_dark.png"), fullPage: true });
    console.log("✓ playground_heroui_desktop_dark.png");
    await page.close();
  }

  // Define screens to capture
  const screens = [
    {
      id: "screen1_home_catalog",
      path: "/",
      prepare: async () => {},
    },
    {
      id: "screen2_category_filters",
      path: "/?category=laptops",
      prepare: async () => {},
    },
    {
      id: "screen3_product_detail",
      path: "/product/apple-macbook-pro-14-m4-pro",
      prepare: async () => {},
    },
    {
      id: "screen4_compare_workspace",
      path: "/compare?ids=apple-macbook-pro-14-m4-pro,lenovo-ideapad-slim-5-14,acer-swift-go-14",
      prepare: async () => {},
    },
    {
      id: "screen5_cart_drawer",
      path: "/",
      prepare: async (page: Page) => {
        // Open cart drawer
        const cartBtn = page.locator("button[aria-label*='Cart'], button:has-text('Cart')").first();
        if (await cartBtn.isVisible()) {
          await cartBtn.click();
          await page.waitForTimeout(500);
        }
      },
    },
    {
      id: "screen6_checkout",
      path: "/checkout",
      prepare: async () => {},
    },
    {
      id: "screen7_pip_assistant",
      path: "/",
      prepare: async (page: Page) => {
        // Open Pip bubble
        const pipTrigger = page.locator("button[aria-label='Talk to Pip'], button[aria-label*='Pip']").first();
        if (await pipTrigger.isVisible()) {
          await pipTrigger.click({ force: true });
          await page.waitForTimeout(500);
        }
      },
    },
  ];

  const viewports = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 390, height: 844 },
  ];

  const themes: Array<"light" | "dark"> = ["light", "dark"];

  for (const s of screens) {
    for (const v of viewports) {
      for (const th of themes) {
        const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
        try {
          await page.goto(`${BASE_URL}${s.path}`, { waitUntil: "networkidle" });
          await setTheme(page, th);
          await s.prepare(page);
          await page.waitForTimeout(300);

          const filename = `${s.id}_${v.name}_${th}.png`;
          const filePath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filePath, fullPage: true });
          console.log(`✓ ${filename}`);
        } catch (err) {
          console.error(`Failed to capture ${s.id} ${v.name} ${th}:`, err);
        } finally {
          await page.close();
        }
      }
    }
  }

  await browser.close();
  console.log(`[capture] All baselines saved cleanly under ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Baseline capture script failed:", err);
  process.exit(1);
});
