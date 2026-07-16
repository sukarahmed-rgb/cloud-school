var STATIC_CACHE = 'cloud-school-static-v4';
var API_CACHE = 'cloud-school-api-v4';
var MAX_CACHE_ENTRIES = 200;

var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/cloud_school_app.js',
  '/cloud_school_styles.css',
  '/features.js',
  '/config.js',
  '/manifest.json',
  '/sw-init.js',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/logo.svg',
  '/i18n/ar.json',
  '/i18n/en.json'
];

var API_DOMAIN = 'cloud-school-api.cloud-school-subdomain.workers.dev';
var API_TTL_MS = 5 * 60 * 1000;

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

  if (url.hostname === API_DOMAIN) {
    if (event.request.method !== 'GET') return;
    event.respondWith(networkFirst(event.request, API_CACHE, API_TTL_MS));
    return;
  }

  if (url.pathname.startsWith('/i18n/')) {
    event.respondWith(networkFirst(event.request, STATIC_CACHE));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(STATIC_CACHE).then(function(cache) {
          trimCache(cache, STATIC_CACHE);
          return cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match('/index.html');
      })
    );
    return;
  }

  if (event.request.method === 'GET') {
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

function trimCache(cache, cacheName) {
  caches.open(cacheName).then(function(c) {
    c.keys().then(function(keys) {
      if (keys.length > MAX_CACHE_ENTRIES) {
        c.delete(keys[0]).then(function() { trimCache(cache, cacheName); });
      }
    });
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    return cached || fetch(request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(STATIC_CACHE).then(function(cache) {
          trimCache(cache, STATIC_CACHE);
          return cache.put(request, clone);
        });
      }
      return response;
    }).catch(function() {
      return new Response(JSON.stringify({ offline: true }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });
}

function networkFirst(request, cacheName, ttl) {
  var cacheKey = 'api:' + request.url;
  var metaKey = 'api-ts:' + request.url;

  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(cacheName).then(function(cache) {
        trimCache(cache, cacheName);
        return cache.put(cacheKey, clone).then(function() {
          if (ttl) return cache.put(metaKey, new Response(String(Date.now())));
        });
      });
    }
    return response;
  }).catch(function() {
    return caches.open(cacheName).then(function(cache) {
      return cache.match(cacheKey).then(function(cached) {
        if (cached && ttl) {
          return cache.match(metaKey).then(function(meta) {
            if (meta) {
              return meta.text().then(function(ts) {
                if (Date.now() - Number(ts) > ttl) {
                  return new Response(JSON.stringify({ offline: true, stale: true }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
                return cached;
              });
            }
            return cached;
          });
        }
        if (cached) return cached;
        return new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    });
  });
}

self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'trigger-sync-offline' });
        });
      })
    );
  }
});
