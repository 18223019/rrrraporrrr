import { chromium } from '@playwright/test';

const TARGET_URL = process.argv[2] ?? 'http://127.0.0.1:8788/dashboard?slug=alif&month=September25&use=pages';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForFunction(() => window.__SSR_HYDRATED__ === true, null, { timeout: 25000 });
  } catch (error) {
    const interimState = await page.evaluate(() => ({
      hydrationFlag: Object.prototype.hasOwnProperty.call(window, '__SSR_HYDRATED__'),
      hydrationState: document.getElementById('root')?.getAttribute('data-hydration-state'),
      htmlAttr: document.documentElement.getAttribute('data-hydration'),
      bodyAttr: document.body?.getAttribute('data-hydration'),
    }));
    console.error('[HydrationCheck:Timeout]', JSON.stringify({ error: String(error), interimState, consoleLogs }, null, 2));
    await browser.close();
    process.exitCode = 1;
    return;
  }

  const state = await page.evaluate(() => ({
    hydrationState: document.getElementById('root')?.getAttribute('data-hydration-state'),
    htmlAttr: document.documentElement.getAttribute('data-hydration'),
    bodyAttr: document.body?.getAttribute('data-hydration'),
  }));
  console.log('[HydrationCheck]', JSON.stringify({ state, consoleLogs }));
  await browser.close();
})();
