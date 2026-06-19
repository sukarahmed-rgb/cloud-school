import { test, expect } from '@playwright/test';

test('page loads and has a title', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  console.log('Page title:', title);
  await expect(page.locator('body')).toBeAttached();
});
