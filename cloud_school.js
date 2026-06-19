// ===================================
// عامل الخدمة - المدرسة السحابية
// يوفر التخزين المؤقت والعمل بدون اتصال
// ===================================

// اسم ذاكرة التخزين المؤقت مع رقم الإصدار للتحديثات
const CACHE_NAME = 'cloud-school-v2';

// قائمة الملفات الأساسية المطلوب تخزينها مؤقتاً
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './cloud_school_styles.css',
  './cloud_school_app.js',
  './manifest.json',
  './i18n/ar.json',
  './i18n/en.json'
];

// حدث التثبيت - تخزين الملفات الأساسية عند أول تشغيل
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('تم تفعيل التخزين المؤقت للتطبيق بنجاح');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // تخطي الانتظار لتفعيل الإصدار الجديد فوراً
  self.skipWaiting();
});

// حدث التنشيط - حذف النسخ القديمة من التخزين المؤقت
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // السيطرة على جميع الصفحات المفتوحة فوراً
  self.clients.claim();
});

// حدث الجلب - استراتيجية الكاش أولاً ثم الشبكة
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إرجاع النسخة المخزنة إن وُجدت، وإلا جلبها من الشبكة
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});