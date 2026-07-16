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
});
