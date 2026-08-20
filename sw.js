const CACHE_NAME = 'drmasum-cache-v4';

// যেসব লোকাল ফাইল ক্যাশে সেভ রাখতে হবে
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

// ১. সার্ভিস ওয়ার্কার ইনস্টল ও ক্যাশিং
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [Service Worker] App Shell Cached');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ২. পুরোনো ক্যাশ মুছে ফেলা
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

// ৩. ফেচ ইন্টারসেপ্ট ও অফলাইন ফলব্যাক হ্যান্ডলার
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ফায়ারবেস API বা অন্য থার্ড-পার্টি ব্যাকএন্ড সার্ভিস ওয়ার্কার ইন্টারসেপ্ট করবে না
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

      // ক্যাশে না থাকলে নেটওয়ার্ক থেকে ডাটা আনার চেষ্টা করবে
      return fetch(event.request).catch(async () => {
        // অফলাইনে পেজ নেভিগেশন/রিফ্রেশ দিলে ক্যাশ থেকে ড্যাশবোর্ড ফেরত দেবে
        if (event.request.mode === 'navigate') {
          const dashboardPage = await caches.match('/dashboard.html');
          if (dashboardPage) return dashboardPage;

          const indexPage = await caches.match('/index.html');
          if (indexPage) return indexPage;
        }

        // ক্যাশে ফাইল না থাকলে ব্রাউজার ক্র্যাশ না করিয়ে ভ্যালিড অফলাইন এরর রেসপন্স দেবে
        return new Response('Resource offline unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});