const { chromium } = require('playwright');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function smoothScroll(page, distance, steps = 25, delay = 35) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'auto' }), distance / steps);
    await sleep(delay);
  }
}

async function runDemo() {
  console.log('================================================================');
  console.log('STARTING AGENT-CENTRIC DEMO WALKTHROUGH (Duration: ~3 min 30 sec)');
  console.log('Launch screen recorder now! Starting in 5 seconds...');
  console.log('================================================================');
  await sleep(5000);

  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized', '--no-default-browser-check', '--disable-infobars'],
  });

  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();

  // 1. HOME & ONE-CLICK CHIP TRIGGER (0:00 - 0:45)
  console.log('[1/5 | 0:00 - 0:45] Storefront home & trigger comparison via prompt chip...');
  await page.goto('https://persona-web-684634843408.asia-south1.run.app', { waitUntil: 'networkidle' });
  await sleep(3500);

  // Click the built-in hero prompt chip: "MacBook Air vs Acer Swift comparison"
  console.log('Clicking "MacBook Air vs Acer Swift comparison" prompt chip...');
  const chipBtn = await page.$('button:has-text("MacBook Air vs Acer Swift comparison")');
  if (chipBtn) {
    await chipBtn.click();
    await sleep(1000);
    const sendArrow = await page.$('button[aria-label="Send to Pip"]');
    if (sendArrow) {
      await sendArrow.click();
    }
  }

  // Wait for Gemini 2.5 Flash to stream the response and generate the in-chat cards
  console.log('Waiting for Pip agent to stream response and in-chat comparison card...');
  await sleep(16000);

  // 2. AGENT TOOL EXECUTION TRACE (0:45 - 1:15)
  console.log('[2/5 | 0:45 - 1:15] Clicking open the Activity trace dropdown inside Pip bubble...');
  const traceToggle = await page.$('div.bubble-scroll button:has-text("Activity"), button:has-text("Activity")');
  if (traceToggle) {
    await traceToggle.click();
    await sleep(4500);
  }

  // 3. LAUNCH COMPARISON WORKSPACE DIRECTLY FROM AGENT CARD (1:15 - 2:00)
  console.log('[3/5 | 1:15 - 2:00] Clicking "Open the comparison" / "Open full comparison" button INSIDE Pip chat...');
  const inChatCompareBtn = await page.$('button:has-text("Open the comparison"), button:has-text("Open full comparison")');
  if (inChatCompareBtn) {
    await inChatCompareBtn.click();
  } else {
    // Fallback: click the compare action link inside the chat bubble
    const compareLink = await page.$('div.bubble-panel a[href*="/compare"], a[href*="/compare"]');
    if (compareLink) await compareLink.click();
  }
  await sleep(4000);

  console.log('Scrolling side-by-side trade-off matrix matching the exact 2 products from chat...');
  await smoothScroll(page, 400, 25, 40);
  await sleep(4500);
  await smoothScroll(page, 400, 25, 40);
  await sleep(4500);

  // 4. BUY DIRECTLY FROM AGENT BUBBLE CARD (2:00 - 2:40)
  console.log('[4/5 | 2:00 - 2:40] Clicking "Buy" button directly inside Pip MiniCards...');
  // Click the green "Buy" button on the recommended product inside Pip bubble
  const buyBtn = await page.$('div.bubble-panel button:has-text("Buy"), button:has-text("Buy")');
  if (buyBtn) {
    console.log('Clicked "Buy" button inside Pip companion card!');
    await buyBtn.click();
    await sleep(4000);
  } else {
    // Fallback: click Add to cart on the comparison table
    const addBtn = await page.$('button:has-text("Add to cart")');
    if (addBtn) {
      await addBtn.click();
      await sleep(2500);
      const checkoutBtn = await page.$('a[href="/checkout"]');
      if (checkoutBtn) await checkoutBtn.click();
    }
  }

  // 5. LIVE MERCHANT COCKPIT (2:40 - 3:20)
  console.log('[5/5 | 2:40 - 3:20] Navigating to Merchant Intelligence Cockpit...');
  await page.goto('https://persona-web-684634843408.asia-south1.run.app/merchant', { waitUntil: 'networkidle' });
  await sleep(2000);

  const emailInput = await page.$('#merchant-email');
  if (emailInput) {
    console.log('Authenticating into Merchant Portal...');
    await emailInput.fill('admin@persona.store');
    await sleep(400);
    const passInput = await page.$('#merchant-password');
    if (passInput) await passInput.fill('persona2026');
    await sleep(600);
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await sleep(3500);
  }

  console.log('Viewing Live Conversion Funnel (scaled to largest step)...');
  await smoothScroll(page, 320, 25, 40);
  await sleep(4000);

  // Click Pip Insights Tab (real customer hesitation & friction alerts)
  console.log('Clicking Pip Insights tab...');
  const insightsLink = await page.$('a[href="/merchant/intelligence"], button:has-text("Pip insights")');
  if (insightsLink) {
    await insightsLink.click();
    await sleep(3500);
    await smoothScroll(page, 300, 25, 40);
    await sleep(4000);
  }

  // Click Inventory Tab (live stock management)
  console.log('Clicking Inventory tab...');
  const inventoryLink = await page.$('a[href="/merchant/inventory"], button:has-text("Inventory")');
  if (inventoryLink) {
    await inventoryLink.click();
    await sleep(3500);
    await smoothScroll(page, 350, 25, 40);
    await sleep(3500);
  }

  // CONCLUSION (3:20 - 3:30)
  console.log('Returning to Storefront for final view...');
  const viewStoreLink = await page.$('a:has-text("View store")');
  if (viewStoreLink) {
    await viewStoreLink.click();
  } else {
    await page.goto('https://persona-web-684634843408.asia-south1.run.app');
  }
  await sleep(4000);

  console.log('================================================================');
  console.log('AGENT-CENTRIC DEMO COMPLETED!');
  console.log('You can now stop your screen recording.');
  console.log('================================================================');
  await sleep(3000);
  await browser.close();
}

runDemo().catch((err) => {
  console.error('Error during demo execution:', err);
});
