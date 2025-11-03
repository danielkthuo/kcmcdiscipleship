const CACHE_NAME = 'kcmc-pathlight-v1.2';
const SYNC_TAG = 'background-sync';
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
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js'
];

// Install event - ENHANCED with background sync
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with background sync');
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
  self.skipWaiting(); // Activate immediately for background sync
});

// Activate event - ENHANCED
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating with background sync capabilities');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('Deleting old cache:', cache);
              return caches.delete(cache);
            }
          })
        );
      }),
      // Claim clients immediately for background sync
      self.clients.claim()
    ])
  );
});

// Fetch event - ENHANCED with offline queue
self.addEventListener('fetch', (event) => {
  // Skip Firebase requests for caching but allow for background sync
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebaseapp.com')) {
    // Let these requests go through for real-time updates
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

// ===== BACKGROUND SYNC IMPLEMENTATION =====

// Background Sync Event - NEW
self.addEventListener('sync', function(event) {
  console.log('Background sync event triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-notifications':
      console.log('Syncing notifications in background');
      event.waitUntil(syncNotifications());
      break;
      
    case 'sync-user-data':
      console.log('Syncing user data in background');
      event.waitUntil(syncUserData());
      break;
      
    case 'sync-offline-actions':
      console.log('Processing offline actions in background');
      event.waitUntil(processOfflineActions());
      break;
      
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Periodic Background Sync - NEW (for newer browsers)
self.addEventListener('periodicsync', function(event) {
  console.log('Periodic background sync:', event.tag);
  
  if (event.tag === 'periodic-notifications-sync') {
    event.waitUntil(syncNotificationsPeriodically());
  }
});

// ===== SYNC FUNCTIONS =====

// Sync notifications in background
async function syncNotifications() {
  try {
    console.log('Starting background notification sync...');
    
    // Get stored user ID from IndexedDB
    const userId = await getStoredUserId();
    if (!userId) {
      console.log('No user ID found for background sync');
      return;
    }

    // Check if we're online
    if (!navigator.onLine) {
      console.log('Offline - queueing sync for later');
      await queueSyncRequest('sync-notifications');
      return;
    }

    // Fetch latest notifications from Firestore
    const notifications = await fetchLatestNotifications(userId);
    console.log(`Fetched ${notifications.length} notifications in background`);
    
    // Store notifications in IndexedDB for offline access
    await storeNotificationsInIDB(notifications);
    
    // Show notification if new items found
    if (notifications.length > 0) {
      await showSyncNotification(notifications.length);
    }
    
    console.log('Background notification sync completed');
    
  } catch (error) {
    console.error('Background sync error:', error);
    await queueSyncRequest('sync-notifications'); // Retry later
  }
}

// Sync user data
async function syncUserData() {
  try {
    console.log('Starting background user data sync...');
    
    const userId = await getStoredUserId();
    if (!userId) return;

    // Sync user preferences, settings, etc.
    const userData = await fetchUserData(userId);
    await storeUserDataInIDB(userData);
    
    console.log('User data sync completed');
    
  } catch (error) {
    console.error('User data sync error:', error);
  }
}

// Process offline actions (like pending messages)
async function processOfflineActions() {
  try {
    console.log('Processing offline actions...');
    
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      await processSingleAction(action);
    }
    
    console.log(`Processed ${pendingActions.length} offline actions`);
    
  } catch (error) {
    console.error('Offline actions processing error:', error);
  }
}

// Periodic sync for notifications
async function syncNotificationsPeriodically() {
  try {
    console.log('Periodic notification sync running...');
    await syncNotifications();
  } catch (error) {
    console.error('Periodic sync error:', error);
  }
}

// ===== INDEXEDDB UTILITIES =====

// Initialize IndexedDB for background sync
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KCMCBackgroundSync', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('notifications')) {
        const notificationsStore = db.createObjectStore('notifications', 
          { keyPath: 'id', autoIncrement: false });
        notificationsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'userId' });
      }
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', 
          { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Store notifications in IndexedDB
async function storeNotificationsInIDB(notifications) {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    // Clear old notifications and add new ones
    await store.clear();
    
    for (const notification of notifications) {
      await store.add(notification);
    }
    
    console.log(`Stored ${notifications.length} notifications in IndexedDB`);
    
  } catch (error) {
    console.error('Error storing notifications in IndexedDB:', error);
  }
}

// Get stored user ID from IndexedDB
async function getStoredUserId() {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction(['userData'], 'readonly');
    const store = transaction.objectStore('userData');
    const request = store.get('currentUser');
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result?.userId || null);
      request.onerror = () => resolve(null);
    });
    
  } catch (error) {
    console.error('Error getting stored user ID:', error);
    return null;
  }
}

// Queue sync request for when online
async function queueSyncRequest(syncType) {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    await store.add({
      type: syncType,
      timestamp: Date.now(),
      attempts: 0
    });
    
    console.log(`Queued sync request: ${syncType}`);
    
  } catch (error) {
    console.error('Error queueing sync request:', error);
  }
}

// Get pending actions from IndexedDB
async function getPendingActions() {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
    
  } catch (error) {
    console.error('Error getting pending actions:', error);
    return [];
  }
}

// ===== NETWORK UTILITIES =====

// Fetch latest notifications from Firestore (simulated)
async function fetchLatestNotifications(userId) {
  // In a real implementation, this would make a Firestore query
  // For now, we'll simulate fetching data
  console.log(`Fetching notifications for user: ${userId}`);
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'bg-sync-' + Date.now(),
          title: 'Background Sync',
          body: 'Your data has been synced in the background',
          timestamp: new Date().toISOString(),
          type: 'system'
        }
      ]);
    }, 1000);
  });
}

// Fetch user data (simulated)
async function fetchUserData(userId) {
  console.log(`Fetching user data for: ${userId}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        userId: userId,
        lastSync: new Date().toISOString(),
        preferences: {}
      });
    }, 500);
  });
}

// Process a single offline action
async function processSingleAction(action) {
  console.log('Processing action:', action.type);
  // Implement action processing logic here
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing
}

// ===== NOTIFICATION UTILITIES =====

// Show sync completion notification
async function showSyncNotification(newItemsCount) {
  const options = {
    body: `Synced ${newItemsCount} new items in the background`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'background-sync',
    requireInteraction: false,
    data: {
      url: self.location.origin + '/updates.html'
    }
  };
  
  await self.registration.showNotification('KCMC Partners - Sync Complete', options);
}

// ===== PUSH NOTIFICATIONS (PRESERVED) =====

self.addEventListener('push', function(event) {
  console.log('Push notification received');
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
    console.log('Push data parsed:', data);
  } catch (e) {
    console.log('Push data parse error, using default');
    data = {
      title: 'KCMC Partners',
      body: event.data.text() || 'New update available',
      icon: '/icons/icon-192x192.png'
    };
  }

  const options = {
    body: data.body || 'New notification from KCMC Partners',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'kcmc-general',
    data: {
      url: data.url || self.location.origin + '/updates.html',
      notificationId: data.notificationId
    },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false
  };

  console.log('Showing notification with options:', options);
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'KCMC Partners', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event.notification.data);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || self.location.origin + '/updates.html';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('Focusing existing app window');
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        console.log('Opening new window to:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ===== MESSAGE HANDLING =====

// Handle messages from the main app
self.addEventListener('message', async (event) => {
  console.log('Service Worker received message:', event.data);
  
  switch (event.data.type) {
    case 'TRIGGER_SYNC':
      console.log('Manual sync triggered from app');
      await syncNotifications();
      break;
      
    case 'STORE_USER_ID':
      console.log('Storing user ID for background sync:', event.data.userId);
      await storeUserId(event.data.userId);
      break;
      
    case 'REGISTER_BACKGROUND_SYNC':
      console.log('Registering background sync');
      await registerBackgroundSync();
      break;
  }
});

// Store user ID for background operations
async function storeUserId(userId) {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction(['userData'], 'readwrite');
    const store = transaction.objectStore('userData');
    
    await store.put({
      userId: userId,
      lastUpdated: Date.now()
    });
    
    console.log('User ID stored for background sync');
    
  } catch (error) {
    console.error('Error storing user ID:', error);
  }
}

// Register background sync
async function registerBackgroundSync() {
  if ('sync' in self.registration) {
    try {
      await self.registration.sync.register('sync-notifications');
      console.log('Background sync registered successfully');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  } else {
    console.log('Background Sync API not supported');
  }
}

// Initialize background sync when service worker starts
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Register periodic sync if supported
      if ('periodicSync' in self.registration) {
        try {
          await self.registration.periodicSync.register('periodic-notifications-sync', {
            minInterval: 24 * 60 * 60 * 1000 // 24 hours
          });
          console.log('Periodic background sync registered');
        } catch (error) {
          console.log('Periodic sync not supported or failed:', error);
        }
      }
    })()
  );
});