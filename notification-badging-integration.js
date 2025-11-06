// notification-badging-integration.js - Integration between Notifications and Badging
class NotificationBadgingIntegration {
    constructor(notificationManager, badgingManager) {
        this.notificationManager = notificationManager;
        this.badgingManager = badgingManager;
        this.initialized = false;
    }

    // Initialize the integration
    async init() {
        if (this.initialized) {
            console.log('Notification-Badging integration already initialized');
            return;
        }

        console.log('Initializing Notification-Badging integration...');

        // Wait for both managers to be ready
        if (!this.notificationManager || !this.badgingManager) {
            console.error('NotificationManager or BadgingManager not provided');
            return;
        }

        // Set up event listeners and hooks
        this.setupNotificationHooks();
        this.setupBadgingListeners();
        this.setupServiceWorkerCommunication();

        // Initial badge sync
        await this.syncBadgeWithNotifications();

        this.initialized = true;
        console.log('Notification-Badging integration initialized successfully');
    }

    // Set up hooks into the NotificationManager
    setupNotificationHooks() {
        // Store original methods
        const originalLoadNotifications = this.notificationManager.loadNotifications?.bind(this.notificationManager);
        const originalMarkAsRead = this.notificationManager.markAsRead?.bind(this.notificationManager);
        const originalMarkAllAsRead = this.notificationManager.markAllAsRead?.bind(this.notificationManager);

        // Hook into loadNotifications
        if (originalLoadNotifications) {
            this.notificationManager.loadNotifications = async (...args) => {
                const result = await originalLoadNotifications(...args);
                await this.onNotificationsLoaded();
                return result;
            };
        }

        // Hook into markAsRead
        if (originalMarkAsRead) {
            this.notificationManager.markAsRead = async (...args) => {
                const result = await originalMarkAsRead(...args);
                await this.onNotificationRead();
                return result;
            };
        }

        // Hook into markAllAsRead
        if (originalMarkAllAsRead) {
            this.notificationManager.markAllAsRead = async (...args) => {
                const result = await originalMarkAllAsRead(...args);
                await this.onAllNotificationsRead();
                return result;
            };
        }

        // Hook into real-time notification additions
        this.setupRealtimeNotificationHooks();

        console.log('Notification hooks installed');
    }

    // Set up real-time notification hooks
    setupRealtimeNotificationHooks() {
        // Monitor for new notifications in real-time
        if (this.notificationManager.notifications) {
            // Use a proxy to detect new notifications
            this.notificationManager.notifications = new Proxy(this.notificationManager.notifications, {
                set: (target, property, value) => {
                    const oldLength = target.length;
                    target[property] = value;
                    
                    // Check if a new notification was added
                    if (property === 'length' && value > oldLength) {
                        setTimeout(() => this.onNewNotificationAdded(), 100);
                    }
                    
                    return true;
                }
            });
        }
    }

    // Set up badging system listeners
    setupBadgingListeners() {
        // Listen for badge changes from the badging system
        if (this.badgingManager) {
            // You can add event listeners if your badging manager supports events
            console.log('Badging listeners ready');
        }
    }

    // Set up service worker communication for badging
    setupServiceWorkerCommunication() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Listen for badge updates from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });

            // Listen for service worker state changes
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                this.onServiceWorkerControllerChange();
            });
        }
    }

    // Handle messages from service worker
    handleServiceWorkerMessage(event) {
        const { type, count } = event.data;

        switch (type) {
            case 'BADGE_UPDATE_REQUEST':
                // Service worker is asking for current badge state
                this.syncBadgeWithNotifications();
                break;

            case 'BADGE_INCREMENT':
                // Service worker wants to increment badge
                this.badgingManager.incrementBadge();
                break;

            case 'BADGE_DECREMENT':
                // Service worker wants to decrement badge
                this.badgingManager.decrementBadge();
                break;
        }
    }

    // Service worker controller changed
    onServiceWorkerControllerChange() {
        console.log('Service Worker controller changed, re-syncing badge');
        setTimeout(() => this.syncBadgeWithNotifications(), 1000);
    }

    // ===== NOTIFICATION EVENT HANDLERS =====

    // Called when notifications are loaded
    async onNotificationsLoaded() {
        console.log('Notifications loaded, updating badge...');
        await this.syncBadgeWithNotifications();
    }

    // Called when a notification is read
    async onNotificationRead() {
        console.log('Notification read, updating badge...');
        await this.syncBadgeWithNotifications();
    }

    // Called when all notifications are read
    async onAllNotificationsRead() {
        console.log('All notifications read, clearing badge...');
        await this.badgingManager.clearBadge();
    }

    // Called when a new notification is added
    async onNewNotificationAdded() {
        console.log('New notification added, updating badge...');
        
        // Wait a bit for the notification to be fully processed
        setTimeout(async () => {
            await this.syncBadgeWithNotifications();
        }, 500);
    }

    // Called when a new notification arrives via push
    async onPushNotificationReceived(notification) {
        console.log('Push notification received, updating badge...');
        await this.badgingManager.incrementBadge();
    }

    // ===== BADGE SYNC METHODS =====

    // Sync badge count with current notifications
    async syncBadgeWithNotifications() {
        if (!this.notificationManager || !this.badgingManager) {
            console.error('Managers not available for badge sync');
            return;
        }

        try {
            const unreadCount = this.calculateUnreadNotifications();
            console.log(`Syncing badge: ${unreadCount} unread notifications`);
            
            if (unreadCount > 0) {
                await this.badgingManager.setBadge(unreadCount);
            } else {
                await this.badgingManager.clearBadge();
            }

            // Notify service worker of badge update
            this.notifyServiceWorkerOfBadgeUpdate(unreadCount);
            
        } catch (error) {
            console.error('Error syncing badge with notifications:', error);
        }
    }

    // Calculate unread notifications count
    calculateUnreadNotifications() {
        if (!this.notificationManager.notifications) {
            return 0;
        }

        return this.notificationManager.notifications.filter(notification => {
            // Different ways notifications might mark as unread
            return !notification.read && 
                   !notification.isRead && 
                   notification.status !== 'read';
        }).length;
    }

    // Notify service worker about badge update
    notifyServiceWorkerOfBadgeUpdate(count) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'BADGE_STATE_UPDATE',
                count: count,
                timestamp: Date.now()
            });
        }
    }

    // ===== MANUAL CONTROL METHODS =====

    // Force badge refresh
    async refreshBadge() {
        await this.syncBadgeWithNotifications();
    }

    // Manually set badge based on custom count
    async setManualBadgeCount(count) {
        await this.badgingManager.setBadge(count);
    }

    // Reset badge to match actual notifications
    async resetBadgeToActual() {
        await this.syncBadgeWithNotifications();
    }

    // ===== STATUS AND DEBUGGING =====

    // Get integration status
    getStatus() {
        return {
            initialized: this.initialized,
            notificationManager: !!this.notificationManager,
            badgingManager: !!this.badgingManager,
            unreadCount: this.calculateUnreadNotifications(),
            badgingSupported: this.badgingManager?.supported || false
        };
    }

    // Debug information
    debug() {
        const status = this.getStatus();
        console.group('🔔 Notification-Badging Integration Debug');
        console.log('Status:', status);
        console.log('Notifications:', this.notificationManager?.notifications?.length || 0);
        console.log('Unread Count:', this.calculateUnreadNotifications());
        console.groupEnd();
        return status;
    }

    // Test the integration
    async testIntegration() {
        console.group('🧪 Testing Notification-Badging Integration');
        
        // Test 1: Initial status
        console.log('Test 1: Initial status', this.getStatus());
        
        // Test 2: Set test badge
        await this.badgingManager.setBadge(3);
        console.log('Test 2: Set badge to 3');
        
        // Test 3: Clear badge
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.badgingManager.clearBadge();
        console.log('Test 3: Cleared badge');
        
        // Test 4: Sync with notifications
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.syncBadgeWithNotifications();
        console.log('Test 4: Synced with notifications');
        
        console.groupEnd();
        console.log('✅ Integration test completed');
    }
}

// ===== GLOBAL INTEGRATION SETUP =====

// Auto-initialize when both managers are available
function setupNotificationBadgingIntegration() {
    // Wait for both managers to be available
    const checkManagers = setInterval(() => {
        if (window.notificationManager && window.badgingManager) {
            clearInterval(checkManagers);
            
            // Create and initialize the integration
            window.notificationBadgingIntegration = new NotificationBadgingIntegration(
                window.notificationManager,
                window.badgingManager
            );
            
            window.notificationBadgingIntegration.init()
                .then(() => {
                    console.log('🎉 Notification-Badging integration ready!');
                    
                    // Make integration globally available
                    window.NBI = window.notificationBadgingIntegration;
                })
                .catch(error => {
                    console.error('Failed to initialize integration:', error);
                });
        }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkManagers);
        if (!window.notificationBadgingIntegration) {
            console.warn('Notification-Badging integration timeout - managers not found');
        }
    }, 10000);
}

// ===== QUICK SETUP FUNCTIONS =====

// Quick setup function
window.setupBadgingIntegration = function(notificationManager, badgingManager) {
    if (!notificationManager) notificationManager = window.notificationManager;
    if (!badgingManager) badgingManager = window.badgingManager;
    
    if (!notificationManager || !badgingManager) {
        console.error('Cannot setup integration: managers not provided');
        return null;
    }
    
    window.notificationBadgingIntegration = new NotificationBadgingIntegration(
        notificationManager,
        badgingManager
    );
    
    return window.notificationBadgingIntegration;
};

// Quick initialization
window.initBadgingIntegration = async function() {
    if (!window.notificationBadgingIntegration) {
        console.error('Integration not setup. Call setupBadgingIntegration first.');
        return false;
    }
    
    return await window.notificationBadgingIntegration.init();
};

// ===== START INTEGRATION =====

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNotificationBadgingIntegration);
} else {
    setupNotificationBadgingIntegration();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NotificationBadgingIntegration,
        setupNotificationBadgingIntegration
    };
}
