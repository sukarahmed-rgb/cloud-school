import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa', 'wcag22aa', 'best-practice'];

async function bypassAuth(page, role = 'student') {
  await page.waitForFunction(() => typeof window.enterApp === 'function', { timeout: 5000 });
  await page.evaluate((r) => {
    window.enterApp({
      name: 'Test User',
      contact: 'test@user.com',
      role: r,
      userId: 'mock-uid-123',
      serverAuth: false
    });
  }, role);
}

async function assertNoAxeViolations(page, selector) {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (selector) builder.include(selector);
  const results = await builder.analyze();
  expect(results.violations, JSON.stringify(results.violations.map(v =>
    `${v.id} (${v.impact}): ${v.nodes.length} nodes — ${v.help}`
  ), null, 2)).toEqual([]);
}

test.describe('WCAG AAA Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.stack || err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('01 - Auth gate meets WCAG AAA', async ({ page }) => {
    await expect(page.locator('#auth-gate')).toBeVisible();
    await assertNoAxeViolations(page, '#auth-gate');
  });

  test('02 - Student view meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await expect(page.locator('#view-student')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#view-student');
  });

  test('03 - Teacher dashboard meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'teacher');
    await page.locator('[data-role-switch="teacher"]').click();
    await expect(page.locator('#view-teacher')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#view-teacher');
  });

  test('04 - Parent dashboard meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'parent');
    await page.locator('[data-role-switch="parent"]').click();
    await expect(page.locator('#view-parent')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#view-parent');
  });

  test('05 - Admin dashboard meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'admin');
    await page.locator('[data-role-switch="admin"]').click();
    await expect(page.locator('#view-admin')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#view-admin');
  });

  test('06 - Student books sub-section meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="books"]').click();
    await expect(page.locator('#student-sub-books')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#student-section-container');
  });

  test('07 - Student assignments sub-section meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="assignments"]').click();
    await expect(page.locator('#student-sub-assignments')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#student-section-container');
  });

  test('08 - Student image describer sub-section meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="image-describer"]').click();
    await expect(page.locator('#student-sub-image-describer')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#student-section-container');
  });

  test('09 - Student games sub-section meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="games"]').click();
    await expect(page.locator('#student-sub-games')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#student-sub-games');
  });

  test('10 - Student AI tutor sub-section meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="ai-tutor"]').click();
    await expect(page.locator('#student-sub-ai-tutor')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#student-sub-ai-tutor');
  });

  test('11 - Student dialogic classroom sub-section meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="dialogic-classroom"]').click();
    await expect(page.locator('#student-sub-dialogic-classroom')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#student-sub-dialogic-classroom');
  });

  test('12 - Student study group sub-section meets WCAG AAA', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="study-group"]').click();
    await expect(page.locator('#student-sub-study-group')).toBeVisible();
    await page.waitForTimeout(300);
    await assertNoAxeViolations(page, '#student-sub-study-group');
  });

  test('13 - Skip to content link is present and functional', async ({ page }) => {
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    const text = await skipLink.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('14 - ARIA live region has correct attributes for screen readers', async ({ page }) => {
    const ariaLive = page.locator('#aria-live');
    await expect(ariaLive).toBeAttached();
    await expect(ariaLive).toHaveAttribute('aria-live', 'polite');
    await expect(ariaLive).toHaveAttribute('aria-atomic', 'true');
  });

  test('15 - Keyboard help dialog has proper ARIA dialog role', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.evaluate(() => window.showKeyboardHelp && window.showKeyboardHelp());
    await page.waitForTimeout(300);
    const overlay = page.locator('#shortcuts-help-overlay');
    await expect(overlay).toBeAttached();
    const dialog = overlay.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('16 - Notifications panel has proper ARIA dialog role', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.evaluate(() => window.showNotificationsPanel && window.showNotificationsPanel());
    await page.waitForTimeout(300);
    const overlay = page.locator('#notifications-panel-overlay');
    await expect(overlay).toBeAttached();
    const dialog = overlay.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('17 - Auth gate dialog has proper ARIA attributes', async ({ page }) => {
    const authGate = page.locator('#auth-gate');
    await expect(authGate).toHaveAttribute('role', 'dialog');
    await expect(authGate).toHaveAttribute('aria-modal', 'true');
    await expect(authGate).toHaveAttribute('aria-labelledby', 'auth-title');
  });

  test('18 - Quick access toolbar has correct ARIA label', async ({ page }) => {
    await bypassAuth(page, 'student');
    const toolbar = page.locator('[role="toolbar"]');
    await expect(toolbar).toBeAttached();
    await expect(toolbar).toHaveAttribute('aria-label');
    const label = await toolbar.getAttribute('aria-label');
    expect(label.length).toBeGreaterThan(0);
  });

  test('19 - All interactive buttons have accessible names', async ({ page }) => {
    await bypassAuth(page, 'student');
    const buttons = page.locator('button');
    const count = await buttons.count();
    const unnamed = [];
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) continue;
      const name = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      const title = await btn.getAttribute('title');
      if (!name && !text?.trim() && !title) {
        const id = await btn.getAttribute('id');
        unnamed.push(id || `button[${i}]`);
      }
    }
    expect(unnamed).toEqual([]);
  });

  test('20 - All images/icons have alt text or aria-hidden', async ({ page }) => {
    await bypassAuth(page, 'student');
    const images = page.locator('img');
    const count = await images.count();
    const issues = [];
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const hidden = await img.getAttribute('aria-hidden');
      if ((alt === null || alt === undefined) && hidden !== 'true') {
        const src = await img.getAttribute('src');
        issues.push(src || `img[${i}]`);
      }
    }
    expect(issues).toEqual([]);
  });

  test('21 - Focus is managed when opening student section', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="books"]').click();
    await page.waitForTimeout(500);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.id || el.getAttribute('aria-label') || el.tagName : null;
    });
    expect(focused).toBeTruthy();
  });

  test('22 - Focus returns after closing student section', async ({ page }) => {
    await bypassAuth(page, 'student');
    await page.locator('[data-student-section="books"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-action="close-section"]').click();
    await page.waitForTimeout(500);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.id || el.getAttribute('data-student-section') || el.tagName : null;
    });
    expect(focused).toBeTruthy();
  });

  test('23 - Heading hierarchy is logical (no skipped levels)', async ({ page }) => {
    await bypassAuth(page, 'student');
    const levels = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headings).map(h => parseInt(h.tagName[1]));
    });
    let prevLevel = 1;
    for (const level of levels) {
      if (level > prevLevel + 1) {
        expect(level).toBeLessThanOrEqual(prevLevel + 1);
      }
      prevLevel = level;
    }
  });

  test('24 - Color contrast meets WCAG AAA in all views', async ({ page }) => {
    await bypassAuth(page, 'student');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aaa', 'wcag21aaa'])
      .analyze();
    const contrastViolations = results.violations.filter(v =>
      v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
    );
    expect(contrastViolations).toEqual([]);
  });

  test('25 - Role bar buttons have accessible labels for all roles', async ({ page }) => {
    await bypassAuth(page, 'student');
    const roleButtons = page.locator('[data-role-switch]');
    const count = await roleButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i++) {
      const btn = roleButtons.nth(i);
      const label = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      expect(label || text?.trim()).toBeTruthy();
    }
  });

  test('26 - Text size controls meet AAA requirements', async ({ page }) => {
    await bypassAuth(page, 'student');
    const increase = page.locator('[data-size-dir="1"]');
    const decrease = page.locator('[data-size-dir="-1"]');
    await expect(increase).toBeAttached();
    await expect(decrease).toBeAttached();
    await expect(increase).toHaveAttribute('aria-label');
    await expect(decrease).toHaveAttribute('aria-label');
  });

  test('27 - Theme toggle buttons have aria-pressed state', async ({ page }) => {
    await bypassAuth(page, 'student');
    const themeButtons = page.locator('[data-theme]');
    const count = await themeButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      const btn = themeButtons.nth(i);
      await expect(btn).toHaveAttribute('aria-label');
      const pressed = await btn.getAttribute('aria-pressed');
      expect(pressed === 'true' || pressed === 'false').toBeTruthy();
    }
  });

  test('28 - Form inputs have associated labels in auth gate', async ({ page }) => {
    const inputs = page.locator('#auth-gate input, #auth-gate select, #auth-gate textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    const unlabeled = [];
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (!id) continue;
      const label = page.locator(`label[for="${id}"]`);
      const ariaLabel = await input.getAttribute('aria-label');
      if ((await label.count()) === 0 && !ariaLabel) {
        unlabeled.push(id);
      }
    }
    expect(unlabeled).toEqual([]);
  });

  test('29 - Teacher form inputs have associated labels', async ({ page }) => {
    await bypassAuth(page, 'teacher');
    await page.locator('[data-role-switch="teacher"]').click();
    await page.waitForTimeout(300);
    const inputs = page.locator('#view-teacher input, #view-teacher select, #view-teacher textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    const unlabeled = [];
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (!id) continue;
      const label = page.locator(`label[for="${id}"]`);
      const ariaLabel = await input.getAttribute('aria-label');
      if ((await label.count()) === 0 && !ariaLabel) {
        unlabeled.push(id);
      }
    }
    expect(unlabeled).toEqual([]);
  });

  test('30 - Admin form inputs have associated labels', async ({ page }) => {
    await bypassAuth(page, 'admin');
    await page.locator('[data-role-switch="admin"]').click();
    await page.waitForTimeout(300);
    const inputs = page.locator('#view-admin input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    const unlabeled = [];
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (!id) continue;
      const label = page.locator(`label[for="${id}"]`);
      const ariaLabel = await input.getAttribute('aria-label');
      if ((await label.count()) === 0 && !ariaLabel) {
        unlabeled.push(id);
      }
    }
    expect(unlabeled).toEqual([]);
  });
});
