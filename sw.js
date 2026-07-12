var CACHE_NAME = 'cloud-school-v3';
var STATIC_CACHE = 'cloud-school-static-v3';
var API_CACHE = 'cloud-school-api-v3';

var STATIC_FILES = [
  '/',
  '/index.html',
  '/cloud_school_app.js',
  '/cloud_school_styles.css',
  '/features.js',
  '/manifest.json',
  '/sw-init.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/logo.svg',
  '/i18n/ar.json',
  '/i18n/en.json'
];

var API_DOMAIN = 'cloud-school-api.cloud-school-subdomain.workers.dev';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(STATIC_FILES);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== STATIC_CACHE && k !== API_CACHE; }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API requests to Cloudflare Worker: network first
  if (url.hostname === API_DOMAIN) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // i18n files: network first (they may update)
  if (url.pathname.startsWith('/i18n/')) {
    event.respondWith(networkFirst(event.request, STATIC_CACHE));
    return;
  }

  // Navigation requests: network first, fallback to index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(STATIC_CACHE).then(function(cache) { cache.put(event.request, clone); });
        return response;
      }).catch(function() {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Static assets: cache first
  if (event.request.method === 'GET') {
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    return cached || fetch(request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(STATIC_CACHE).then(function(cache) { cache.put(request, clone); });
      }
      return response;
    }).catch(function() {
      if (request.mode === 'navigate') return caches.match('/index.html');
      return new Response('Offline', { status: 503 });
    });
  });
}

function networkFirst(request, cacheName) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(cacheName).then(function(cache) { cache.put(request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      return cached || new Response(JSON.stringify({ offline: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });
}
