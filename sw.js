const CACHE_NAME = 'drmasum-cache-v2';

// ১. অফলাইনে চলার জন্য প্রয়োজনীয় সব ফাইল ও CDN লিংক এখানে দিন
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // আপনার ব্যবহৃত সিডিএন (CDN) লিংকগুলো এখানে যোগ করুন:
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js'
];

// ১. Install Event - ফাইল ক্যাশে জমা করা
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ২. Activate Event - পুরোনো ক্যাশ ডিলিট করা
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ৩. Fetch Event - ক্যাশ থেকে দেওয়া, না পেলে ইন্টারনেট থেকে এনে ক্যাশে সেভ করা
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse; // ক্যাশে থাকলে সেখান থেকেই লোড হবে
      }
      return fetch(event.request).then(networkResponse => {
        // রেসপন্স ঠিক থাকলে ভবিষ্যতে অফলাইনে ব্যবহারের জন্য ক্যাশে সেভ করা
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});