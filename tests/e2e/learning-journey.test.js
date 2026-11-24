import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue()
      : route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/');
  await page.waitForFunction(() => typeof window.enterApp === 'function');
});
async function enter(page, role = 'student', id = 'journey-a') {
  await page.evaluate(
    ({ role, id }) =>
      window.enterApp({
        serverId: id,
        name: 'Synthetic',
        contact: `${id}@example.invalid`,
        role,
        serverAuth: false,
      }),
    { role, id },
  );
}
async function seed(page) {
  await page.evaluate(async () => {
    const { localData } = await import('/src/modules/app-state.js');
    localData.books = [
      {
        id: 'lesson',
        title: 'درس تجريبي',
        subject: 'دراسات اجتماعية تجريبية',
        unitTitle: 'فهم المكان',
        lessonTitle: 'وصف الطريق',
        content: 'نص تجريبي غير رسمي.\nحدد نقطة البداية.\nرتب خطوات الطريق.',
        audio: '',
        publicationStatus: 'published',
      },
    ];
    localData.assignments = [
      {
        id: 'task',
        title: 'واجب تجريبي',
        lessonId: 'lesson',
        type: 'text',
        question: 'صف طريقا مألوفا',
        subject: 'دراسات اجتماعية تجريبية',
        unitTitle: 'فهم المكان',
        lessonTitle: 'وصف الطريق',
      },
    ];
    (await import('/src/modules/learning-journey.js')).renderLearningJourney();
  });
}
test('complete synthetic lesson journey resumes paragraph, restores answer draft and displays confirmed feedback', async ({
  page,
}) => {
  await enter(page);
  await seed(page);
  await page.getByRole('button', { name: 'ابدأ الدرس', exact: true }).click();
  await expect(page.locator('#journey-reader')).toContainText('جزء 1 من 3');
  await page
    .locator('#learning-journey')
    .screenshot({ path: '/downloads/cloud-school-journey/lesson-reader.png' });
  await page.getByRole('button', { name: 'الجزء التالي', exact: true }).click();
  await expect(page.locator('#journey-reader')).toContainText('جزء 2 من 3');
  await page.evaluate(async () => {
    (await import('/src/modules/learning-journey.js')).renderLearningJourney();
  });
  await page.getByRole('button', { name: 'أكمل الدرس', exact: true }).click();
  await expect(page.locator('#journey-reader')).toContainText('جزء 2 من 3');
  await page.getByRole('button', { name: 'أنهيت قراءة الدرس', exact: true }).click();
  await page.getByRole('button', { name: 'واجب: واجب تجريبي', exact: true }).click();
  await page.locator('#assignment-student-answer').fill('إجابة تجريبية محفوظة');
  await expect(page.locator('#answer-draft-status')).toContainText('لم تسلم');
  await page.evaluate(async () => {
    const q = await import('/src/modules/quizzes.js');
    q.startQuiz('task');
    q.clearQuizTimer();
  });
  await expect(page.locator('#assignment-student-answer')).toHaveValue('إجابة تجريبية محفوظة');
  await page.evaluate(async () => {
    const s = await import('/src/modules/app-state.js');
    s.localData.submissions = [
      {
        quizId: 'task',
        quizTitle: 'واجب تجريبي',
        initialScore: 80,
        status: 'graded',
        syncStatus: 'sent',
        graderFeedback: 'شرح واضح، أضف علامة مكانية.',
      },
    ];
    (await import('/src/modules/learning-journey.js')).renderLearningJourney();
  });
  await expect(page.locator('#journey-results')).toContainText('80%');
  await expect(page.locator('#journey-results')).toContainText('أضف علامة مكانية');
  await page
    .locator('#learning-journey')
    .screenshot({ path: '/downloads/cloud-school-journey/student-journey.png' });
});
test('account change clears active answer and prevents its timer submitting as the next user', async ({
  page,
}) => {
  await enter(page);
  await seed(page);
  await page.getByRole('button', { name: 'واجب: واجب تجريبي', exact: true }).click();
  await page.locator('#assignment-student-answer').fill('private A');
  await enter(page, 'student', 'journey-b');
  await expect(page.locator('#active-quiz-panel')).toBeHidden();
  expect(
    await page.evaluate(async () => {
      const q = await import('/src/modules/quizzes.js');
      q.submitQuizAnswer();
      return (await import('/src/modules/app-state.js')).localData.submissions.length;
    }),
  ).toBe(0);
});
test('teacher previews and saves a private organized draft, then explicitly publishes', async ({
  page,
}) => {
  await enter(page, 'teacher');
  const form = page.locator('form[data-action="teacher-quiz-form"]');
  await expect(form.locator('[name=publicationStatus]')).toHaveValue('draft');
  await form.locator('[name=subject]').fill('دراسات اجتماعية تجريبية');
  await form.locator('[name=unitTitle]').fill('فهم المكان');
  await form.locator('[name=lessonTitle]').fill('وصف الطريق');
  await page.locator('#teacher-quiz-title').fill('سؤال مسودة');
  await page.locator('#teacher-quiz-q').fill('أين نقطة البداية؟');
  for (const [id, text] of [
    ['a', 'المنزل'],
    ['b', 'الحقل'],
    ['c', 'الشارع'],
    ['d', 'المدرسة'],
  ]) {
    await page.locator(`#teacher-quiz-o${id}`).fill(text);
  }
  await form.getByRole('button', { name: 'معاينة قبل الحفظ' }).click();
  await expect(form).toContainText('معاينة خاصة بالمدرس');
  await form.locator('button[type=submit]').click();
  const article = page
    .locator('#content-studio article')
    .filter({ has: page.getByRole('heading', { name: 'واجب: سؤال مسودة', exact: true }) });
  await expect(article).toContainText('مسودة خاصة');
  await article.getByRole('button', { name: 'نشر للفصل', exact: true }).click();
  await expect(page.locator('#content-studio')).toContainText('منشور للفصل');
  await page
    .locator('#content-studio')
    .screenshot({ path: '/downloads/cloud-school-journey/teacher-studio.png' });
});

test('reconnected offline answer updates visible delivery state and removes only its draft', async ({
  page,
}) => {
  await enter(page);
  await seed(page);
  const result = await page.evaluate(async () => {
    const s = await import('/src/modules/app-state.js');
    const q = await import('/src/modules/offline-sync.js');
    const j = await import('/src/modules/journey-state.js');
    const data = {
      quizId: 'task',
      quizTitle: 'واجب تجريبي',
      studentAnswer: 'answer',
      syncStatus: 'pending',
    };
    j.saveAnswerDraft('task', 'answer');
    await q.queueOfflineSave('submissions', data);
    s.localData.submissions = [data];
    await q.syncOfflineData(async () => ({
      id: 'server-answer',
      quizId: 'task',
      quizTitle: 'واجب تجريبي',
      studentAnswer: 'answer',
    }));
    (await import('/src/modules/learning-journey.js')).renderLearningJourney();
    return {
      status: s.localData.submissions[0].syncStatus,
      draft: j.readJourney().drafts.task,
      left: (await q.getPendingSaves()).length,
    };
  });
  expect(result).toEqual({ status: 'sent', draft: undefined, left: 0 });
  await expect(page.locator('#journey-results')).toContainText('تم التسليم، بانتظار التصحيح');
});

test('new lesson reader and teacher fields pass selected automated accessibility rules', async ({
  page,
}) => {
  await enter(page);
  await seed(page);
  await page.getByRole('button', { name: 'ابدأ الدرس', exact: true }).click();
  let result = await new AxeBuilder({ page })
    .include('#learning-journey')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page
    .locator('#learning-journey')
    .screenshot({ path: '/downloads/cloud-school-journey/lesson-mobile.png' });
  await enter(page, 'teacher', 'teacher-a');
  await expect(page.locator('[data-content-fields]').first()).toBeVisible();
  result = await new AxeBuilder({ page })
    .include('[data-content-fields]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('hostile lesson text is literal and unsafe media URLs do not produce active elements',async({page})=>{
 await enter(page);await seed(page);
 await page.evaluate(async()=>{
  const {localData}=await import('/src/modules/app-state.js');
  const payload='<img src=x onerror="window.contentExecuted=true">';
  localData.books[0].title=payload;localData.books[0].content=payload;localData.books[0].audio='javascript:window.contentExecuted=true';
  (await import('/src/modules/learning-journey.js')).renderLearningJourney();
  (await import('/src/modules/learning-journey.js')).openLesson('lesson');
 });
 await expect(page.locator('#journey-reader')).toContainText('<img src=x');
 expect(await page.locator('#journey-reader img, #journey-reader script, #journey-reader audio').count()).toBe(0);
 expect(await page.evaluate(()=>window.contentExecuted)).toBeUndefined();
});
