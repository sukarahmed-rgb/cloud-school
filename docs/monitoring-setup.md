# Monitoring & Backups — دليل الإعداد

نظام المراقبة الحالي يعمل من غير أي حساب خارجي (0 تكلفة)، وتقدر تضيف
Sentry لما يكون عندك حساب. كل حاجة موثقة هنا.

---

## 1) مراقبة التوفر (Uptime) — شغال تلقائيًا ✅

ملف `.github/workflows/uptime-monitor.yml` بيفحص كل 15 دقيقة:

| الهدف | الرابط |
|---|---|
| Worker API | `https://cloud-school-api.cloud-school-subdomain.workers.dev/api/health` |
| Hosting | `https://cloud-school-6251a.web.app/` |

- لو أي جهة رجعت غير `200` → workflow يفشل ويفتح **Issue في GitHub**
  بعنوان "⛔ Cloud School is DOWN" تلقائيًا.
- لما الخدمة ترجع شغالة → الـ Issue يتقفل تلقائيًا.
- البطاقة `uptime` بتحصر القلقات المفتوحة.

> لسه بتفتح GitHub؟ يبقى اسم الـ repo نفسه يتكتب في أعلى الصفحة:
> **Actions → Uptime Monitor → Run workflow** (تقدر تجربه يدويًا دلوقتي).

---

## 2) نسخ احتياطي لقاعدة البيانات D1 — شغال تلقائيًا ✅

ملف `.github/workflows/d1-backup.yml` بينفّذ نسخة يومية الساعة 2:17 صباحًا:

- `npx wrangler d1 export cloud-school-db --remote` → ملف SQL
- يترفع كـ **Artifact** في GitHub محفوظ 90 يوم.

### الاستعادة (Restore) — 3 طرق:

1. **من الـ Artifact:**
   ```
   npx wrangler d1 execute cloud-school-db --remote --file=backup.sql
   ```
   (نزّل أحدث `d1-backup-<run_id>` من GitHub Actions أولًا)

2. **من Time Travel المدمج (أقوى خيار):** Cloudflare بتحفظ نسخ
   Point-in-time داخل آخر 30 يوم. لو حصل حذف عرضي، دي أسرع طريقة.
   - Dashboard → D1 → `cloud-school-db` → Backups

3. **تشغيل نسخة يدوية دلوقتي:**
   ```
   npx wrangler d1 export cloud-school-db --remote --output=backup-manual.sql
   ```

> ملاحظة: قفل الكتابة على قاعدة البيانات (WAL) ممكن يتسبب في خطأ أثناء
> الـ export لو في عمليات مفتوحة. لو حصل، أعد تشغيل الـ workflow.

---

## 3) اختبارات الـ API الحي — شغال تلقائيًا ✅

- ملف الاختبارات: `tests/integration/worker-api.test.mjs` (7 اختبارات)
- بيجري: `/api/health`، CORS، 404، الجلسات، الأمان
- تشغيل يدوي:
  ```
  npm run test:integration
  ```
- في CI: workflow `integration.yml` بيشتغل **كل يوم اثنين** + يدويًا
  من **Actions → Live API Integration Tests → Run workflow**.

---

## 4) أمان التبعيات ✅

- `npm audit` → **0 ثغرات في الإنتاج** ✅
- 19 ثغرة متبقية كلها في أدوات التطوير (firebase-tools, live-server, @lhci/cli)
  — مينفعش يتصلحوا غير بترقية كبيرة بتكسر التوافق، فالخطة:
  - `dependabot.yml` بيفتح PR أسبوعيًا يصلحهم بالتدريج
  - متجاهلين الترقيات الكبيرة لكسرية لـ `@lhci/cli` و `live-server` عن عمد
- تأكد من تفعيل **Dependabot alerts** في GitHub:
  **Settings → Code security and analysis** (بيبقى مفعّل افتراضيًا)

---

## 5) Sentry — جاهز للتفعيل لما تحب (خطوة بخطوة) 🔧

الكود كله مرتبط وجاهز، محتاجين بس أرقام. الترتيب:

1. **إنشاء حساب:** افتح https://sentry.io/signup (مجاني 5k أحداث/شهر).

2. **إنشاء مشروع:**
   - Create Project → اختار **JavaScript**
   - اختار Platform: Browser
   - سمّيه مثلًا `cloud-school`

3. **استخرج الـ DSN** (شكلها):
   ```
   https://abc123xyz@sentry.io/4500000000000000
   ```

4. **تفعيل الـ Client (الموقع):** افتح `public/config.js` وغير
   ```
   const __SENTRY_DSN = '';
   ```
   إلى
   ```
   const __SENTRY_DSN = 'https://abc123xyz@sentry.io/4500000000000000';
   ```
   بعدها deploy الـ hosting:
   ```
   npx firebase deploy --only hosting
   ```

5. **تفعيل الـ Worker (الـ API):** حط الـ DSN كـ secret:
   ```
   npx wrangler secret put SENTRY_DSN
   ```

6. **إعادة نشر الـ Worker:**
   ```
   npx wrangler deploy
   ```

7. **تحقق:** اقرأ صفحة Issues في Sentry — أي خطأ بيظهر خلال دقائق.
   (تقدر تجرب: اعمل POST ناقص أو ادخل رابط غلط من المتصفح).

> أمان: الـ DSN مش سر — بيبقى ظاهر في أي تطبيق ويب عادي، ومفعّلة
> عليه قيود من سيرفر Sentry نفسه. بس الحدود اللي على السيرفر كفيلة.
