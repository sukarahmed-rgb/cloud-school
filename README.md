# Cloud School (كلاود سكول)

منصة تعليمية سحابية متكاملة مصممة خصيصًا لتلبية احتياجات الطلاب المكفوفين وضعاف البصر.

**الموقع المباشر:** [https://cloud-school-6251a.web.app](https://cloud-school-6251a.web.app)

## المميزات
- **مساعد صوتي ذكي (AI Co-Pilot):** يقرأ المناهج والأسئلة والردود بصوت طبيعي (Gemini TTS + Browser Speech)
- **محاكي كيبورد برايل (Perkins):** يتيح للطلاب الكتابة باستخدام نقاط برايل الست
- **الفصل الذكي الحواري:** تعلّم بالحوار الصوتي التفاعلي مع مدرس افتراضي ذكي
- **المذاكر الجماعي الصوتي:** جلسات مناقشة جماعية مع وسيط ذكي
- **واصف الرسوم البيانية:** رفع الصور ليقوم الذكاء الاصطناعي بوصفها صوتيًا
- **الواجبات والاختبارات:** اختبارات تفاعلية مع تصحيح ذكي
- **الألعاب التعليمية:** ألعاب صوتية تفاعلية (Speed Challenge, Storyteller, Memory)
- **لوحة متابعة التقدم:** إحصائيات شاملة للاختبارات والكتب والألعاب
- **متعدد اللغات (i18n):** يدعم العربية والإنجليزية (450+ مفتاح لكل لغة)
- **دعم PWA:** يعمل كتطبيق ويب قابل للتثبيت على الهواتف والأجهزة اللوحية
- **التباين العالي:** 3 سمات ألوان (داكن عالي التباين، فاتح عالي التباين، كلاسيك)

## هيكلة المشروع

```
cloud_school/
├── index.html                 # الصفحة الرئيسية (SPA)
├── cloud_school_app.js        # ملف التطبيق الرئيسي (UI, Braille, i18n, Firebase, Gemini, Audio)
├── cloud_school_styles.css    # الأنماط (Tailwind-inspired)
├── config.js                  # إعدادات Firebase و URL الخادم الخلفي
├── favicon.svg + favicon.ico  # أيقونات المتصفح
├── manifest.json              # بيان تطبيق PWA
├── sw.js                      # Service Worker (تخزين مؤقت + دعم عدم الاتصال)
├── sw-init.js                 # تهيئة Service Worker
├── offline.html               # صفحة عدم الاتصال بالإنترنت
├── features.js                # دوال النظام (Dialogic Classroom, Study Group, Text-to-Speech, i18n)
├── i18n/                      # ملفات الترجمة
│   ├── ar.json                #     العربية (450+ مفتاح)
│   └── en.json                #     الإنجليزية (450+ مفتاح)
├── icons/                     # أيقونات PWA
│   ├── icon-192.svg
│   ├── icon-512.svg
│   ├── icon-512.png
│   └── logo.svg
├── tests/                     # اختبارات الوحدة (Jest)
│   └── unit/
│       ├── worker.test.js     #     اختبارات الخادم الخلفي (RBAC, Cookies, Sanitization)
│       ├── frontend.test.js   #     اختبارات الواجهة (i18n, escapeHtml, secureRandom)
│       ├── logic.test.js      #     اختبارات المنطق (Notifications, Themes, Text Size)
│       ├── timer.test.js      #     اختبارات المؤقت
│       ├── braille.test.js    #     اختبارات برايل
│       ├── audioContext.test.js  #  اختبارات الصوت
│       └── errors.test.js     #     اختبارات معالج الأخطاء
├── worker/                    # Cloudflare Worker (الخادم الخلفي الرئيسي)
│   └── index.js               #     RBAC, Firebase Auth, Gemini Proxy, KV CRUD
├── .env.example               # مثال لمتغيرات البيئة
├── firebase.json              # إعدادات Firebase Hosting
├── package.json               # تبعيات المشروع
├── jest.config.js             # إعدادات Jest
└── playwright.config.js       # إعدادات Playwright
```

## المعمارية

```
المستعرض (PWA) ←→ Firebase Hosting (CDN)
     │
     ├── Firebase Auth (تسجيل الدخول)
     ├── Gemini API (AI: دردشة، وصف صور، تحويل نص→صوت، اختبارات)
     └── Cloudflare Worker (API Proxy, RBAC, Session Management)
              │
              └── Cloudflare KV (تخزين البيانات)
                   ├── DATA (المحتوى: مناهج، واجبات، طلاب)
                   ├── SESSIONS (جلسات المستخدمين)
                   └── CONFIG (إعدادات)
```

## البدء السريع

### المتطلبات الأساسية
- متصفح حديث (Chrome أو Firefox)
- Node.js 18+ (للاختبارات)

### التشغيل للتطوير

```bash
# تثبيت الاعتماديات
npm install

# تشغيل الخادم المحلي
npm run dev
```

### الاختبارات

```bash
# اختبارات الوحدة (85 اختبار)
npm test
```

### النشر

```bash
# نشر على Firebase Hosting
firebase deploy --only hosting --project cloud-school-6251a

# نشر Cloudflare Worker
npx wrangler deploy
```

## الأمان

- **RBAC كامل** على الخادم الخلفي لكل عملية CRUD
- **CSP ضيقة** (Content Security Policy) في `index.html` مع `frame-ancestors 'none'` و `object-src 'none'`
- **Session Cookies** مع HttpOnly, Secure, SameSite=None
- **معدل طلب محدود** (Rate Limiting) على كل النقاط
- **المفاتيح السرية** (`GEMINI_API_KEY`, `FIREBASE_API_KEY`) في Cloudflare Workers secrets (مش في الكود)
- **رمز دعوة المشرف** (`ADMIN_INVITE_CODE`) لمنع تسجيل admin ذاتي
- **التشفير في الطريق** عبر HTTPS (Firebase Hosting + Cloudflare Workers)
- **مفاتيح i18n** محمية ضد XSS عبر `escapeHtml()`

## التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| Firebase Hosting | استضافة الموقع مع CDN عالمي |
| Firebase Auth | توثيق المستخدمين (Google, Email) |
| Cloudflare Workers | خادم خلفي Edge مع RBAC |
| Cloudflare KV | تخزين البيانات NoSQL |
| Gemini API (Google) | AI: دردشة، وصف صور، TTS، توليد اختبارات، تصحيح |
| Vanilla JS | بدون أي Framework (للأداء العالي) |
| PWA | Service Worker + Manifest للتثبيت |
| Jest | اختبارات الوحدة (85 اختبار) |

---

*بُني هذا النظام لخدمة ذوي الهمم وتوفير بيئة تعليمية متطورة.*

**الموقع المباشر:** [https://cloud-school-6251a.web.app](https://cloud-school-6251a.web.app)

**رخصة:** MIT
