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

test.describe('E2E User Journey Flow', () => {
  test('should allow teacher to create a quiz and student to view it', async ({ page }) => {
    await page.goto('/');

    // Log in as teacher
    await bypassAuth(page, 'teacher');
    await expect(page.locator('#view-teacher')).toBeVisible();

    // Create a new MCQ Quiz
    await page.fill('#teacher-quiz-title', 'اختبار الجغرافيا التجريبي');
    await page.fill('#teacher-quiz-q', 'ما هي عاصمة مصر؟');
    await page.fill('#teacher-quiz-oa', 'القاهرة');
    await page.fill('#teacher-quiz-ob', 'الرياض');
    await page.fill('#teacher-quiz-oc', 'الخرطوم');
    await page.fill('#teacher-quiz-od', 'عمان');
    await page.selectOption('#teacher-quiz-correct', 'A');

    // Submit the form
    await page.locator('form[data-action="teacher-quiz-form"] button[type="submit"]').click();

    // Switch to student view
    await page.locator('[data-role-switch="student"]').click();
    await expect(page.locator('#view-student')).toBeVisible();

    // Open student assignments section
    await page.locator('[data-student-section="assignments"]').click();
    await expect(page.locator('#student-sub-assignments')).toBeVisible();

    // Verify that the newly created quiz is listed on the student's dashboard
    const newQuizTitle = page.locator('#student-assignments-list');
    await expect(newQuizTitle).toContainText('اختبار الجغرافيا التجريبي');
  });
});
