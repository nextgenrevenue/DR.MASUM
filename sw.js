const CACHE_NAME = 'drmasum-pwa-v1';

// যেসব ফাইল অফলাইনে চালানোর জন্য সেভ রাখতে হবে
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/pwa.js',
  '/manifest.json',
  // এক্সটার্নাল সিডিএন ফাইলসমূহ
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics-compat.js'
];

// ১. সার্ভিস ওয়ার্কার ইন্সটল ও ফাইল ক্যাশ করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [Service Worker] Caching App Shell & Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ২. পুরোনো ক্যাশ ক্লিয়ার করা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ৩. নেটওয়ার্ক রিকোয়েস্ট হ্যান্ডেল করা (অফলাইনে ক্যাশ থেকে ফাইল দেওয়া)
self.addEventListener('fetch', (event) => {
  // শুধুমাত্র GET রিকোয়েস্ট ও আমাদের ওয়েবসাইটের রিকোয়েস্ট ক্যাশ করা হবে
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // অফলাইনে থাকলে ক্যাশ থেকে ফাইল দেখাবে
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* অফলাইন থাকলে নেটওয়ার্ক এরর ইগনোর করবে */});

        return cachedResponse;
      }

      // ক্যাশে না থাকলে নেটওয়ার্ক থেকে আনবে
      return fetch(event.request).catch(() => {
        // নেভিগেশন এরর হলে অফলাইনে ড্যাশবোর্ড বা ইনডেক্স দেখাবে
        if (event.request.mode === 'navigate') {
          return caches.match('/dashboard.html') || caches.match('/index.html');
        }
      });
    })
  );
});