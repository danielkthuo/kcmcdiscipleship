// Import badging functionality
importScripts('./js/badging.js');
importScripts('./js/notification-manager.js');

const CACHE_NAME = 'kcmc-pathlight-v1.3'; // Updated version
// ... rest of your existing sw.js code remains the same ...

// Add this to your existing message handler in sw.js:
self.addEventListener('message', async (event) => {
  console.log('Service Worker received message:', event.data);
  
  switch (event.data.type) {
    // ... your existing cases ...
    
    case 'GET_BADGE_COUNT':
      console.log('Sending badge count to app');
      const count = await getStoredBadgeCount();
      event.ports[0]?.postMessage({
        type: 'BADGE_COUNT_UPDATE',
        count: count
      });
      break;
      
    case 'CLEAR_BADGE':
      console.log('Clearing badge');
      await updateAppBadge(0);
      await storeBadgeCount(0);
      break;
      
    case 'MARK_NOTIFICATIONS_READ':
      console.log('Marking all notifications as read');
      await markNotificationsAsRead();
      break;
  }
});