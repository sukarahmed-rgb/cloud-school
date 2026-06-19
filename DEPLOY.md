# نشر Cloud School

## 1. GitHub Pages (تلقائي)

1. ارفع المشروع إلى GitHub
2. تفعيل GitHub Pages من Settings > Pages > Source: GitHub Actions
3. ادفع تغييراتك إلى `main` — الـ CI سينشر تلقائياً

## 2. تشغيل الخادم الوسيط (Proxy)

```bash
# 1. انسخ .env.example إلى .env
cp .env.example .env
# 2. أضف مفتاح Gemini API
# 3. شغّل
npm run proxy
```

في الإنتاج، استخدم PM2 أو systemd لتشغيل الـ proxy كخدمة خلفية:
```bash
npm install -g pm2
pm2 start proxy/server.js --name cloud-school-proxy
```

## 3. Firebase (اختياري)

لتفعيل المزامنة السحابية:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

## متغيرات البيئة المطلوبة

| المتغير | الشرح |
|---------|-------|
| `GEMINI_API_KEY` | مفتاح Google Gemini API (إجباري) |
| `PORT` | منفذ الخادم الوسيط (افتراضي: 3001) |
| `CORS_ORIGIN` | رابط الواجهة الأمامية المسموح بها |
