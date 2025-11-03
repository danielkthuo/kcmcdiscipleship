// sw.js - Enhanced Service Worker with Push Notifications
const CACHE_NAME = 'kcmc-pathlight-v1.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/activities.html',
  '/budget.html',
  '/updates.html',
  '/contact.html',
  '/styles.css',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
];

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration for service worker
firebase.initializeApp({
  apiKey: "AIzaSyDfNX8WUWfUAN-dIUtzq8gJXjh0CIZdS_0",
  authDomain: "kcmcpartners.firebaseapp.com",
  projectId: "kcmcpartners",
  storageBucket: "kcmcpartners.firebasestorage.app",
  messagingSenderId: "30984885444",
  appId: "1:30984885444:web:0be4febff8cfef1b22a591",
  measurementId: "G-Z6FMF6Z1V1"
});

const messaging = firebase.messaging();

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip Firebase requests
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebaseapp.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Handle background messages (when app is closed)
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  
  const notificationTitle = payload.data?.title || payload.notification?.title || 'KCMC Partners';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || 'You have a new message',
    icon: '../icons/icon-192x192.png',
    badge: '../icons/icon-72x72.png',
    data: payload.data || {},
    tag: payload.data?.type || 'general',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received: ', event);
  
  event.notification.close();

  const notificationData = event.notification.data;
  const action = event.action;

  if (action === 'dismiss') {
    return;
  }

  // Determine URL to open based on notification data
  let urlToOpen = '/index.html';
  if (notificationData?.url) {
    urlToOpen = notificationData.url;
  } else if (notificationData?.type === 'message') {
    urlToOpen = '/index.html#messages';
  }

  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true})
    .then((windowClients) => {
      // Check if app is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          // Send message to the open client to handle the notification
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData
          });
          return client.focus();
        }
      }
      
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log('New subscription:', subscription);
        // Send new subscription to server
        return fetch('/api/update-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription: subscription })
        });
      })
      .catch((error) => {
        console.error('Error updating subscription:', error);
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});