// In your existing NotificationManager class, add:
async init() {
    // Your existing init code...
    
    // Initialize badging integration
    this.initBadgingIntegration();
}

initBadgingIntegration() {
    // Update badge when notifications load
    this.updateBadgeFromNotifications();
    
    // Listen for badge updates from service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SET_BADGE') {
                window.badgingManager.setBadge(event.data.count);
            } else if (event.data.type === 'CLEAR_BADGE') {
                window.badgingManager.clearBadge();
            }
        });
    }
}

updateBadgeFromNotifications() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    window.badgingManager.setBadge(unreadCount);
}

// Call this when marking notifications as read
async markAsRead(notificationId) {
    // Your existing markAsRead code...
    
    // Update badge
    this.updateBadgeFromNotifications();
}