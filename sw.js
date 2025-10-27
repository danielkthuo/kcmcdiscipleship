// sw.js - Service Worker for Kingdom Covenant Ministries App
const CACHE_NAME = 'kcm-church-v1.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/auth-check.js',
  '/manifest.json',
  '/new.html',
  '/offline.html',
  '/progress.html',
  '/offline.html',
  '/sw.js',
  '/pathlight-module/gifts.html',
  '/pathlight-module/progress.html',
  '/pathlight-module/header.html',
  '/pathlight-module/module-introduction.html',
  '/pathlight-module/module-lesson1.html',
  '/pathlight-module/module-lesson2.html',
  '/pathlight-module/module-lesson3.html',
  '/pathlight-module/module-lesson4.html',
  '/pathlight-module/module-lesson5.html',
  '/partners/admin/admin.html',
  '/partners/activities.html',
  '/partners/budget.html',
  '/partners/contact.html',
  '/partners/firebase-config.js',
  '/partners/index.html',
  '/partners/manifest.json',
  '/partners/styles.css', 
  '/partners/sw.js',
  '/partners/updates.html',
 '/ partners\admin\admin.html',
  '/parenting-module1/app.html',
  
  // Add all your module HTML files here
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('All resources cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.log('Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Chrome extensions
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it's a one-time use stream
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              // Cache the new resource
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // If both cache and network fail, show offline page
          if (event.request.destination === 'document') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});