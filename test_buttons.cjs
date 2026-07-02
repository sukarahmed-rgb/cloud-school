const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') errors.push(msg.type() + ': ' + msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));
  try {
    await page.goto('http://127.0.0.1:8081/', { timeout: 15000, waitUntil: 'load' });
    await page.waitForTimeout(2000);
    
    if (errors.length === 0) console.log('CONSOLE: No errors/warnings');
    else errors.forEach(e => console.log('CONSOLE:', e));

    const info = await page.evaluate(() => ({
      onloadSet: typeof window.onload === 'function',
      speakFn: typeof speak === 'function',
      bindAllEvents: typeof bindAllEvents === 'function',
      bypassAuthDemo: typeof bypassAuthDemo === 'function',
      handleLoginSubmit: typeof handleLoginSubmit === 'function',
      demoBtnExists: !!document.querySelector('[data-action="bypass-demo"]'),
      loginFormExists: !!document.querySelector('[data-action="login-form"]'),
      showRegisterExists: !!document.getElementById('btn-show-register'),
      audioCoPilotEnabled: typeof audioCoPilotEnabled !== 'undefined' ? audioCoPilotEnabled : 'UNDEFINED',
      accessibleVoicesController: typeof accessibleVoicesController !== 'undefined' ? accessibleVoicesController : 'UNDEFINED',
    }));
    
    console.log('INFO:', JSON.stringify(info, null, 2));

    // Try clicking demo button
    await page.click('[data-action="bypass-demo"]');
    await page.waitForTimeout(1000);
    
    const afterDemo = await page.evaluate(() => ({
      authGateHidden: document.getElementById('auth-gate').classList.contains('hidden'),
      viewStudentVisible: !document.getElementById('view-student').classList.contains('hidden'),
    }));
    console.log('After demo click:', JSON.stringify(afterDemo, null, 2));

  } catch(e) {
    console.log('TEST_ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
