import { test, expect } from '@playwright/test';

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

test.describe('Cloud School E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.stack || err.message));
    await page.goto('/');
  });

  test('should load and show auth gate with login form', async ({ page }) => {
    await expect(page).toHaveTitle(/Cloud School/);

    const authGate = page.locator('#auth-gate');
    await expect(authGate).toBeVisible();

    // Login form should be visible initially
    const loginForm = page.locator('#login-form-container');
    await expect(loginForm).toBeVisible();

    // Register form should be hidden initially
    const registerForm = page.locator('#register-form-container');
    await expect(registerForm).toHaveClass(/hidden/);

    // Login button
    const loginBtn = page.locator('#btn-login-submit');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toHaveText(/تسجيل الدخول/);
  });

  test('should toggle between login and register forms', async ({ page }) => {
    await page.waitForFunction(() => typeof window.enterApp === 'function', { timeout: 5000 });

    // Click "إنشاء حساب جديد"
    await page.locator('#btn-show-register').click();
    await expect(page.locator('#register-form-container')).toBeVisible();
    await expect(page.locator('#login-form-container')).toHaveClass(/hidden/);

    // Click back to login
    await page.locator('#btn-show-login').click();
    await expect(page.locator('#login-form-container')).toBeVisible();
    await expect(page.locator('#register-form-container')).toHaveClass(/hidden/);
  });

  test('should bypass auth and show student view', async ({ page }) => {
    await bypassAuth(page, 'student');

    // Auth gate should be hidden
    await expect(page.locator('#auth-gate')).toHaveClass(/hidden/);

    // Student view should be visible
    const studentView = page.locator('#view-student');
    await expect(studentView).toBeVisible();

    // Welcome message should be present
    await expect(page.locator('#student-welcome-msg')).toBeVisible();
  });

  test('should show student role bar after bypass', async ({ page }) => {
    await bypassAuth(page, 'student');

    const roleBar = page.locator('#dev-role-bar');
    await expect(roleBar).toBeVisible();
  });

  test('should switch roles via role bar buttons', async ({ page }) => {
    await bypassAuth(page, 'student');

    // Click teacher role
    await page.locator('[data-role-switch="teacher"]').click();
    await expect(page.locator('#view-teacher')).toBeVisible();
    await expect(page.locator('#view-student')).toHaveClass(/hidden/);

    // Switch back to student
    await page.locator('[data-role-switch="student"]').click();
    await expect(page.locator('#view-student')).toBeVisible();
    await expect(page.locator('#view-teacher')).toHaveClass(/hidden/);
  });

  test('should open and close student sections', async ({ page }) => {
    await bypassAuth(page, 'student');

    // Open books section
    await page.locator('[data-student-section="books"]').click();
    await expect(page.locator('#student-section-container')).toBeVisible();
    await expect(page.locator('#student-sub-books')).toBeVisible();

    // Close section
    await page.locator('[data-action="close-section"]').click();
    await expect(page.locator('#student-section-container')).toHaveClass(/hidden/);
  });

  test('should show assignment options in student view', async ({ page }) => {
    await bypassAuth(page, 'student');

    // Open assignments section
    await page.locator('[data-student-section="assignments"]').click();
    await expect(page.locator('#student-sub-assignments')).toBeVisible();
  });

  test('ARIA live region exists for screen reader announcements', async ({ page }) => {
    const ariaLive = page.locator('#aria-live');
    await expect(ariaLive).toBeAttached();
    await expect(ariaLive).toHaveAttribute('aria-live', 'polite');
  });

  test('should include service worker registration', async ({ page }) => {
    const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasSW).toBe(true);
  });

  test('should have theme toggle buttons', async ({ page }) => {
    const darkThemeBtn = page.locator('[data-theme="dark-hc"]');
    await expect(darkThemeBtn).toBeVisible();

    const lightThemeBtn = page.locator('[data-theme="light-hc"]');
    await expect(lightThemeBtn).toBeVisible();
  });

  test('should have text size controls', async ({ page }) => {
    const increaseBtn = page.locator('[data-size-dir="1"]');
    await expect(increaseBtn).toBeVisible();

    const decreaseBtn = page.locator('[data-size-dir="-1"]');
    await expect(decreaseBtn).toBeVisible();
  });
});
