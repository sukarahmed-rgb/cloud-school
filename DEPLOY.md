# نشر Cloud School

## 1. Firebase Hosting (تلقائي via GitHub Actions)

كل push إلى `main` يشغل:

1. `test_and_build` — تشغيل `npm test` + `npm run build`
2. `deploy-firebase` — نشر `dist/` إلى Firebase Hosting
3. `deploy-cloudflare` — نشر Worker + تشغيل D1 Migrations

### المتطلبات:
- `FIREBASE_SERVICE_ACCOUNT_CLOUD_SCHOOL_6251A` — JSON key (GitHub Secret)
- `CLOUDFLARE_API_TOKEN` — Cloudflare API Token (GitHub Secret)
- `CLOUDFLARE_ACCOUNT_ID` — معرف حساب Cloudflare (GitHub Secret)

## 2. التشغيل المحلي

```bash
npm install
npx vite          # dev server على http://localhost:5173
npx playwright test   # اختبارات E2E
```

## 3. البنية التحتية

| الطبقة | التقنية |
|--------|---------|
| الواجهة | Vite + Vanilla JS |
| الاستضافة | Firebase Hosting (`dist/`) |
| Backend API | Cloudflare Worker (D1 + KV) |
| المصادقة | Firebase Auth → Session Cookies |
| الذكاء الاصطناعي | Gemini API عبر Worker Proxy |
| قاعدة البيانات | Cloudflare D1 (SQLite) |
| التخزين المؤقت | Cloudflare KV (سريع، TTL) |
