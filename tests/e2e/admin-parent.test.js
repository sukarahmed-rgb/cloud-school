import { test, expect } from '@playwright/test';

async function bypassAuth(page, role = 'student') {
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

test.describe('Admin & Parent E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    await page.goto('/');
  });

  test('should show admin view with student table', async ({ page }) => {
    await bypassAuth(page, 'admin');
    await expect(page.locator('#view-admin')).toBeVisible();
    const tbody = page.locator('#admin-students-tbody');
    await expect(tbody).toBeAttached();
  });

  test('should show admin student creation form', async ({ page }) => {
    await bypassAuth(page, 'admin');
    await expect(page.locator('#admin-student-name')).toBeVisible();
    await expect(page.locator('#admin-student-grade')).toBeVisible();
  });

  test('should allow admin to add a new student', async ({ page }) => {
    await bypassAuth(page, 'admin');
    await page.fill('#admin-student-name', 'طالب جديد');
    await page.fill('#admin-student-grade', 'الصف الخامس');
    await page.locator('form[data-action="admin-student-form"] button[type="submit"]').click();
  });

  test('should show parent view with child info', async ({ page }) => {
    await bypassAuth(page, 'parent');
    await expect(page.locator('#view-parent')).toBeVisible();
    await expect(page.locator('#parent-grades-list')).toBeAttached();
  });

  test('should show parent notifications section', async ({ page }) => {
    await bypassAuth(page, 'parent');
    await expect(page.locator('#parent-notifications-list')).toBeAttached();
  });
});

test.describe('Theme & Accessibility E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should switch between themes', async ({ page }) => {
    await bypassAuth(page, 'student');
    const darkBtn = page.locator('[data-theme="dark-hc"]');
    await expect(darkBtn).toBeVisible();
    await darkBtn.click();
    const lightBtn = page.locator('[data-theme="light-hc"]');
    await lightBtn.click();
  });

  test('should adjust text size', async ({ page }) => {
    await bypassAuth(page, 'student');
    const increaseBtn = page.locator('[data-size-dir="1"]');
    const decreaseBtn = page.locator('[data-size-dir="-1"]');
    await expect(increaseBtn).toBeVisible();
    await expect(decreaseBtn).toBeVisible();
    await increaseBtn.click();
    await decreaseBtn.click();
  });
});
