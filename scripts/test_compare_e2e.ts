import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function run() {
  console.log(`[test_compare_e2e] Running Playwright E2E compare flows against ${baseUrl}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // ----------------------------------------------------
    // Flow 1: Add 2 products from catalog -> tray shows 2 -> click Compare -> lands on /compare?ids=...
    // ----------------------------------------------------
    console.log("\n--- Flow 1: Catalog Add to Compare & Tray Navigation ---");
    const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page1 = await context1.newPage();
    await page1.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page1.waitForTimeout(600);

    // Find first two compare toggle buttons on catalog cards
    const compareToggles = page1.locator("button[title='Compare'], button[aria-label*='Add'][aria-label*='comparison']");
    const toggleCount = await compareToggles.count();
    console.log(`Found ${toggleCount} compare toggle buttons on catalog`);
    if (toggleCount < 2) throw new Error("Could not find at least 2 compare buttons on catalog");

    await compareToggles.nth(0).click({ force: true });
    await page1.waitForTimeout(300);
    await compareToggles.nth(1).click({ force: true });
    await page1.waitForTimeout(500);

    // Verify compare tray appears and shows 2 products
    const trayRegion = page1.locator("[role='region'][aria-label='Comparison tray']");
    await trayRegion.waitFor({ state: "visible", timeout: 5000 });
    const compareBtn = trayRegion.locator("button", { hasText: "Compare 2" });
    await compareBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Tray is visible with 'Compare 2' button");

    // Click Compare and verify landing on /compare?ids=...
    await compareBtn.click();
    await page1.waitForURL(/\/compare\?ids=/, { timeout: 8000 });
    console.log(`✓ Landed on compare URL: ${page1.url()}`);

    const compareWorkspace = page1.locator("[data-compare-workspace='true']");
    await compareWorkspace.waitFor({ state: "visible", timeout: 5000 });
    const table = page1.locator("table");
    await table.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Semantic comparison table is visible");

    // ----------------------------------------------------
    // Flow 2: Toggle differences-only -> matching rows hidden -> announced to screen readers
    // ----------------------------------------------------
    console.log("\n--- Flow 2: Differences-Only Toggle ---");
    const diffSwitch = page1.locator("button[role='switch']");
    await diffSwitch.waitFor({ state: "visible", timeout: 5000 });

    const liveRegion = page1.locator("[data-diff-announcement='true']");
    const initialText = await liveRegion.textContent();
    console.log(`Initial live announcement: "${initialText?.trim()}"`);

    // Toggle switch ON
    await diffSwitch.click();
    await page1.waitForTimeout(300);
    const toggledState = await diffSwitch.getAttribute("aria-checked");
    if (toggledState !== "true") throw new Error("Switch aria-checked is not true");

    const toggledAnnouncement = await liveRegion.textContent();
    console.log(`✓ Toggled live announcement: "${toggledAnnouncement?.trim()}"`);
    if (!toggledAnnouncement?.includes("Filtered to")) {
      throw new Error("Screen reader announcement did not update on toggle");
    }

    // Toggle switch back OFF
    await diffSwitch.click();
    await page1.waitForTimeout(300);
    const resetState = await diffSwitch.getAttribute("aria-checked");
    if (resetState !== "false") throw new Error("Switch aria-checked did not reset to false");
    console.log("✓ Differences-only toggle operates with screen reader announcements");

    // ----------------------------------------------------
    // Flow 3: Remove 1 product -> URL updates -> tray updates -> still 2-4 -> remove another -> shows empty state
    // ----------------------------------------------------
    console.log("\n--- Flow 3: Removal & URL / Tray Synchronization ---");
    // Click remove on the first product column
    const removeButtons = page1.locator("th button[aria-label*='Remove'][aria-label*='comparison']");
    const initialProductColumns = await removeButtons.count();
    console.log(`Initial product count in table: ${initialProductColumns}`);

    // Let's add a 3rd product first so we can test 3 -> 2 -> 1
    const addProductSelect = page1.locator("select[aria-label='Add another product to compare']");
    if (await addProductSelect.count()) {
      await addProductSelect.selectOption({ index: 1 });
      await page1.waitForTimeout(500);
      console.log(`After adding a 3rd product, URL is: ${page1.url()}`);
    }

    const currentRemoveButtons = page1.locator("th button[aria-label*='Remove'][aria-label*='comparison']");
    const countBeforeRemove = await currentRemoveButtons.count();

    // Remove one product
    await currentRemoveButtons.first().click();
    await page1.waitForTimeout(600);
    console.log(`After removing 1 product, URL is: ${page1.url()}`);

    // Verify remaining count in table
    const countAfterFirstRemove = await page1.locator("th button[aria-label*='Remove'][aria-label*='comparison']").count();
    if (countAfterFirstRemove !== countBeforeRemove - 1) {
      throw new Error(`Expected ${countBeforeRemove - 1} products, got ${countAfterFirstRemove}`);
    }
    console.log(`✓ Product removed: count decreased from ${countBeforeRemove} to ${countAfterFirstRemove}`);

    // If still >= 2, remove until 1 remains
    while (await page1.locator("th button[aria-label*='Remove'][aria-label*='comparison']").count() >= 2) {
      await page1.locator("th button[aria-label*='Remove'][aria-label*='comparison']").first().click();
      await page1.waitForTimeout(500);
    }

    // Now with fewer than 2 products, verify empty state renders
    const emptyState = page1.locator("[role='status']", { hasText: "compare" });
    await emptyState.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Friendly empty state displayed when fewer than 2 products remain");
    await context1.close();

    // ----------------------------------------------------
    // Flow 4: Shareable URL: load /compare?ids=p1,p2 directly in new context -> renders correctly
    // ----------------------------------------------------
    console.log("\n--- Flow 4: Shareable Direct URL in Fresh Context ---");
    const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await context2.newPage();
    const shareableUrl = `${baseUrl}/compare?ids=lenovo-ideapad-slim-5-14,acer-swift-go-14`;
    await page2.goto(shareableUrl, { waitUntil: "domcontentloaded" });
    await page2.waitForTimeout(600);

    const shareableTable = page2.locator("table");
    await shareableTable.waitFor({ state: "visible", timeout: 5000 });

    const title1 = page2.locator("text=IdeaPad Slim 5 14");
    const title2 = page2.locator("text=Swift Go 14");
    if (!(await title1.count()) || !(await title2.count())) {
      throw new Error("Shareable URL did not render expected products");
    }
    console.log("✓ Direct URL loads correctly with side-by-side comparison");
    await context2.close();

    // ----------------------------------------------------
    // Flow 5: Cross-category comparison: add laptop + headphones -> banner appears -> click filter -> non-matching removed
    // ----------------------------------------------------
    console.log("\n--- Flow 5: Cross-Category Comparison & Filter ---");
    const context3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page3 = await context3.newPage();
    const crossCatUrl = `${baseUrl}/compare?ids=lenovo-ideapad-slim-5-14,sony-wh-1000xm5`;
    await page3.goto(crossCatUrl, { waitUntil: "domcontentloaded" });
    await page3.waitForTimeout(600);

    const crossCatAlert = page3.locator("[role='alert']", { hasText: "Cross-Category" });
    await crossCatAlert.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Cross-category alert banner appeared");

    const filterBtn = crossCatAlert.locator("button", { hasText: "Filter to" }).first();
    await filterBtn.waitFor({ state: "visible", timeout: 5000 });
    await filterBtn.click();
    await page3.waitForTimeout(600);

    // After filtering down to 1 category (1 item), suggestion chips appear to complete 2-product comparison
    const chipNotice = page3.locator("text=requires at least 2 products");
    await chipNotice.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Suggestion chips appeared to replace non-matching category product");
    await context3.close();

    // ----------------------------------------------------
    // Flow 6: Pip on /compare: pin 3, Pip adds a 4th, reload (identical view), Pip removes one
    // ----------------------------------------------------
    console.log("\n--- Flow 6: Pip on /compare: Pin 3, Add 4th, Reload, Remove One ---");
    const context4 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page4 = await context4.newPage();
    const pin3Url = `${baseUrl}/compare?ids=apple-macbook-pro-14-m4-pro,lenovo-ideapad-slim-5-14,acer-swift-go-14`;
    await page4.goto(pin3Url, { waitUntil: "domcontentloaded" });
    await page4.waitForTimeout(600);

    // Verify 3 products in table initially
    const headersBefore = page4.locator("th button[aria-label*='Remove'][aria-label*='comparison']");
    const countBefore = await headersBefore.count();
    console.log(`Initial pinned products in table: ${countBefore}`);
    if (countBefore !== 3) throw new Error(`Expected 3 products, found ${countBefore}`);

    const sendChat = async (msg: string) => {
      const handled = await page4.evaluate((text) => {
        const win = window as unknown as Record<string, { getState: () => { send: (t: string) => Promise<void> } }>;
        if (win.useChat) {
          void win.useChat.getState().send(text);
          return true;
        }
        return false;
      }, msg);
      if (!handled) {
        const talkBtn = page4.locator("button[aria-label='Talk to Pip']");
        const input = page4.locator("#pip-input");
        if (!(await input.isVisible())) {
          await talkBtn.click({ force: true });
          await input.waitFor({ state: "visible", timeout: 5000 });
        }
        await input.fill(msg);
        await input.press("Enter");
      }
    };

    // Pip adds a 4th product via chat turn: "Add HP Pavilion to compare"
    console.log("Asking Pip: 'Add HP Pavilion to compare'...");
    await sendChat("Add HP Pavilion to compare");
    // Wait for agent turn to process and URL to update
    await page4.waitForURL(/hp-pavilion-plus-14/, { timeout: 15000 });
    await page4.waitForTimeout(600);

    const headersAfterAdd = page4.locator("th button[aria-label*='Remove'][aria-label*='comparison']");
    const countAfterAdd = await headersAfterAdd.count();
    console.log(`After Pip added 4th: count is ${countAfterAdd}, URL: ${page4.url()}`);
    if (countAfterAdd !== 4) throw new Error(`Expected 4 products after Pip add, got ${countAfterAdd}`);

    // Reload page to verify identical 4-product view
    console.log("Reloading page to verify refresh safety...");
    await page4.reload({ waitUntil: "domcontentloaded" });
    await page4.waitForTimeout(600);

    const headersAfterReload = page4.locator("th button[aria-label*='Remove'][aria-label*='comparison']");
    const countAfterReload = await headersAfterReload.count();
    console.log(`After reload: count is ${countAfterReload}`);
    if (countAfterReload !== 4) throw new Error(`Expected 4 products after reload, got ${countAfterReload}`);
    console.log("✓ Identical 4-product view confirmed after reload");

    // Pip removes one product: "Remove Acer Swift from compare"
    console.log("Asking Pip: 'Remove Acer Swift from compare'...");
    await sendChat("Remove Acer Swift from compare");
    // Wait for URL to update (no longer containing acer-swift-go-14)
    await page4.waitForFunction(
      () => !window.location.search.includes("acer-swift-go-14"),
      { timeout: 15000 },
    );
    await page4.waitForTimeout(600);

    const headersAfterRemove = page4.locator("th button[aria-label*='Remove'][aria-label*='comparison']");
    const countAfterRemove = await headersAfterRemove.count();
    console.log(`After Pip removed 1: count is ${countAfterRemove}, URL: ${page4.url()}`);
    if (countAfterRemove !== 3) throw new Error(`Expected 3 products after Pip remove, got ${countAfterRemove}`);
    console.log("✓ Pip successfully added 4th, view reloaded identically, and Pip removed one");
    await context4.close();

    console.log("\n=======================================================");
    console.log("ALL 6 PLAYWRIGHT E2E FLOWS PASSED SUCCESSFULLY!");
    console.log("=======================================================\n");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("[FATAL E2E ERROR]", err);
  process.exit(1);
});
