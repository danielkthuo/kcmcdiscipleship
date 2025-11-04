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
  '/partnership.html',
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
  '/partners/admin/admin.html',
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

// ====== PUSH NOTIFICATION HANDLERS ======

// Push notification event
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
    console.log('Push data:', data);
  } catch (error) {
    console.log('Push data is not JSON, using text:', event.data.text());
    data = {
      title: 'KCMC Church',
      body: event.data.text() || 'You have a new message from Kingdom Covenant Ministries',
      icon: '/icons/icon-152x152.png'
    };
  }

  const options = {
    body: data.body || 'You have a new message from KCMC',
    icon: data.icon || '/icons/icon-152x152.png',
    badge: '/icons/icon-72x72.png',
    tag: 'kcmc-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'View Message'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Kingdom Covenant Ministries', 
      options
    ).then(() => {
      console.log('Notification shown successfully');
    }).catch(error => {
      console.error('Error showing notification:', error);
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'dismiss') {
    console.log('Notification dismissed');
    return;
  }

  // Default action - open the app
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clientList => {
      console.log('Found clients:', clientList.length);
      
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('Focusing existing client:', client.url);
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        console.log('Opening new window');
        let url = '/';
        
        // If there's specific data for where to navigate, use it
        if (notificationData && notificationData.url) {
          url = notificationData.url;
        }
        
        return clients.openWindow(url);
      }
    }).catch(error => {
      console.error('Error handling notification click:', error);
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event);
});

// Handle background messages from Firebase
self.addEventListener('push', event => {
  // This is already handled above, but we'll add specific Firebase handling
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.from === 'firebase') {
        console.log('Firebase push message received:', data);
        // You can add specific Firebase handling here if needed
      }
    } catch (error) {
      console.log('Non-JSON push data received');
    }
  }
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle notification-related messages from the main thread
  if (event.data && event.data.type === 'NOTIFICATION_PERMISSION') {
    console.log('Notification permission message received:', event.data);
  }
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      doBackgroundSync().then(() => {
        console.log('Background sync completed');
      }).catch(error => {
        console.error('Background sync failed:', error);
      })
    );
  }
});

// Helper function for background sync
async function doBackgroundSync() {
  // This would handle syncing any pending data when the connection is restored
  console.log('Performing background sync...');
  
  // You can add specific sync logic here for your app
  // For example, syncing progress data, messages, etc.
  
  return Promise.resolve();
}

// Periodic sync for regular updates (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'content-update') {
      console.log('Periodic sync for content updates');
      event.waitUntil(updateCachedContent());
    }
  });
}

// Helper function to update cached content
async function updateCachedContent() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      // Skip external resources
      if (request.url.startsWith(self.location.origin)) {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            console.log('Updated cached resource:', request.url);
          }
        } catch (error) {
          console.log('Failed to update:', request.url, error);
        }
      }
    }
  } catch (error) {
    console.error('Error updating cached content:', error);
  }
}

console.log('Service Worker loaded with push notification support');