const CACHE_NAME = 'drmasum-cache-v5'; 

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/tokenmanagement.html',
  '/allserial.html',
  '/pwa.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [Service Worker] App Shell Cached');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; 
      }

      return fetch(event.request).catch(async () => {
        if (event.request.mode === 'navigate') {
          const dashboardPage = await caches.match('/dashboard.html');
          if (dashboardPage) return dashboardPage;

          const indexPage = await caches.match('/index.html');
          if (indexPage) return indexPage;
        }

        return new Response('Resource offline unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});