import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function bypassAuth(page, role = 'student') {
  // Wait for window.enterApp to be defined to avoid race conditions with async module loading
  await page.waitForFunction(() => typeof window.enterApp === 'function', { timeout: 5000 });
  await page.evaluate((r) => {
    window.enterApp({
      name: 'Test User',
      contact: 'test@user.com',
      role: r,
      userId: 'mock-uid-123',
      serverAuth: false,
    });
  }, role);
}

test.describe('WCAG AAA Accessibility Audit', () => {
  test('Auth Gate should have no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag2aaa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Student Dashboard should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await bypassAuth(page, 'student');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag2aaa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Teacher Dashboard should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await bypassAuth(page, 'teacher');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag2aaa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Focus moves to the role heading after entering the app', async ({ page }) => {
    await page.goto('/');
    await bypassAuth(page, 'teacher');

    await expect(page.locator('#teacher-dashboard-heading')).toBeFocused({ timeout: 5000 });
  });

  test('Escape closes the notifications panel and restores focus', async ({ page }) => {
    await page.goto('/');
    await bypassAuth(page, 'student');
    await page.evaluate(() => window.addNotification('Test', 'Details'));

    await page.locator('#btn-notifications').click();
    await expect(page.locator('#notifications-panel-overlay')).toBeVisible();
    await expect(page.locator('#btn-close-notifs')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#notifications-panel-overlay')).toBeHidden();
    await expect(page.locator('#btn-notifications')).toBeFocused();
  });

  test('Escape closes the keyboard help overlay and restores focus', async ({ page }) => {
    await page.goto('/');
    await bypassAuth(page, 'student');
    await page.evaluate(() => document.getElementById('btn-help-shortcuts').focus());

    await page.evaluate(() => window.showKeyboardHelp());
    await expect(page.locator('#shortcuts-help-overlay')).toBeVisible();
    await expect(page.locator('#btn-close-help')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#shortcuts-help-overlay')).toBeHidden();
    await expect(page.locator('#btn-help-shortcuts')).toBeFocused();
  });
});
