const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE: ' + err.message));
  try {
    await page.goto('http://127.0.0.1:8081/', { timeout: 15000, waitUntil: 'networkidle' });
    // Wait for scripts to execute
    await page.waitForTimeout(2000);
    console.log('=== CONSOLE ERRORS ===');
    if (errors.length === 0) console.log('NONE');
    else errors.forEach(e => console.log(e));
    // Check if window.onload was set
    const hasOnload = await page.evaluate(() => typeof window.onload === 'function');
    console.log('window.onload set:', hasOnload);
    const hasSpeak = await page.evaluate(() => typeof speak === 'function');
    console.log('speak function:', hasSpeak);
    const hasBindEvents = await page.evaluate(() => typeof bindAllEvents === 'function');
    console.log('bindAllEvents:', hasBindEvents);
    // Check auth buttons
    const btnDemo = await page.[data-action="bypass-demo"];
    console.log('Demo button exists:', !!btnDemo);
  } catch(e) {
    console.error('TEST ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
