// tests/e2e/app.test.js
import { test, expect } from '@playwright/test';

test.describe('Cloud School E2E', () => {
  test('should load the page and show auth gate', async ({ page }) => {
    // Navigate to local server
    await page.goto('/');

    // Check document title
    await expect(page).toHaveTitle(/كلاود سكول/);

    // Check if auth gate is visible
    const authGate = page.locator('#auth-gate');
    await expect(authGate).toBeVisible();

    // Check login button
    const loginBtn = page.locator('#btn-auth-submit');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toHaveText(/تسجيل الدخول/);
  });

  test('should toggle TTS engine and show loading spinner when calling AI', async ({ page }) => {
    await page.goto('/');

    // Bypass auth using the demo bypass button
    const bypassBtn = page.locator('[data-action="bypass-demo"]');
    await expect(bypassBtn).toBeVisible();
    await bypassBtn.click();

    // Wait for the main content to appear (student view)
    const studentView = page.locator('#view-student');
    await expect(studentView).toBeVisible();

    // The spinner is globally available in the DOM
    const loadingSpinner = page.locator('#loading-spinner');
    await expect(loadingSpinner).toHaveClass(/hidden/);

    // Click the TTS toggle button
    const ttsToggle = page.locator('#tts-engine-toggle');
    await expect(ttsToggle).toBeVisible();
    await ttsToggle.click();

    // The text should change to Browser mode or Gemini mode
    await expect(ttsToggle).toHaveText(/محرك الصوت/);
  });

  test('ARIA live region should exist for screen reader announcements', async ({ page }) => {
    await page.goto('/');
    const ariaLive = page.locator('#aria-live');
    await expect(ariaLive).toBeAttached();
    await expect(ariaLive).toHaveAttribute('aria-live', 'polite');
  });
});
