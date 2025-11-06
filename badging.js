// badging.js - App Icon Badging for KCMC App
class AppBadgingManager {
    constructor() {
        this.supported = 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
        this.currentCount = 0;
        this.initialized = false;
    }

    // Initialize the badging system
    async init() {
        if (!this.supported) {
            console.log('App Badging API not supported in this browser');
            return false;
        }

        console.log('App Badging API is supported');
        this.initialized = true;
        
        // Set up connection with notification system
        this.setupNotificationIntegration();
        
        return true;
    }

    // Set up integration with existing notification system
    setupNotificationIntegration() {
        // Listen for storage events (if notifications are stored in localStorage)
        window.addEventListener('storage', (e) => {
            if (e.key === 'unreadNotifications' || e.key?.includes('notification')) {
                this.updateBadgeFromNotifications();
            }
        });

        // Poll for notification updates (fallback)
        this.startPolling();
        
        // Listen for custom events from your notification system
        window.addEventListener('notificationUpdate', (e) => {
            this.handleNotificationUpdate(e.detail);
        });

        console.log('Badging system integrated with notification system');
    }

    // Start polling for notification updates
    startPolling() {
        setInterval(() => {
            this.updateBadgeFromNotifications();
        }, 30000); // Check every 30 seconds
    }

    // Update badge based on notification count
    async updateBadgeFromNotifications() {
        try {
            const unreadCount = await this.getUnreadNotificationCount();
            await this.setBadge(unreadCount);
        } catch (error) {
            console.error('Error updating badge from notifications:', error);
        }
    }

    // Get unread notification count from various sources
    async getUnreadNotificationCount() {
        // Method 1: Check your existing notification system
        if (window.notificationManager) {
            return this.getCountFromNotificationManager();
        }

        // Method 2: Check Firebase (if available)
        if (window.firebase && window.firebase.auth().currentUser) {
            return this.getCountFromFirebase();
        }

        // Method 3: Check localStorage
        return this.getCountFromLocalStorage();
    }

    // Get count from notification manager
    getCountFromNotificationManager() {
        try {
            const notifications = window.notificationManager?.notifications || [];
            return notifications.filter(n => !n.read).length;
        } catch (error) {
            console.error('Error getting count from notification manager:', error);
            return 0;
        }
    }

    // Get count from Firebase
    async getCountFromFirebase() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) return 0;

            const snapshot = await firebase.firestore()
                .collection('userMessages')
                .where('recipientId', '==', user.uid)
                .where('read', '==', false)
                .get();

            return snapshot.size;
        } catch (error) {
            console.error('Error getting count from Firebase:', error);
            return 0;
        }
    }

    // Get count from localStorage
    getCountFromLocalStorage() {
        try {
            const notifications = JSON.parse(localStorage.getItem('kcmc_notifications') || '[]');
            return notifications.filter(n => !n.read).length;
        } catch (error) {
            console.error('Error getting count from localStorage:', error);
            return 0;
        }
    }

    // Set the app badge with a specific number
    async setBadge(count) {
        if (!this.supported || !this.initialized) {
            console.log('Badging not available');
            return false;
        }

        try {
            this.currentCount = count;
            
            if (count > 0) {
                await navigator.setAppBadge(count);
                console.log(`App badge set to: ${count}`);
                
                // Also update the tab badge if supported
                if ('setClientBadge' in navigator) {
                    await navigator.setClientBadge(count);
                }
            } else {
                await this.clearBadge();
            }
            
            // Dispatch event for other components
            this.dispatchBadgeUpdateEvent(count);
            
            return true;
        } catch (error) {
            console.error('Error setting app badge:', error);
            return false;
        }
    }

    // Clear the app badge
    async clearBadge() {
        if (!this.supported || !this.initialized) {
            return false;
        }

        try {
            this.currentCount = 0;
            await navigator.clearAppBadge();
            
            // Also clear tab badge if supported
            if ('clearClientBadge' in navigator) {
                await navigator.clearClientBadge();
            }
            
            console.log('App badge cleared');
            this.dispatchBadgeUpdateEvent(0);
            
            return true;
        } catch (error) {
            console.error('Error clearing app badge:', error);
            return false;
        }
    }

    // Increment the badge count
    async incrementBadge() {
        const newCount = this.currentCount + 1;
        return await this.setBadge(newCount);
    }

    // Decrement the badge count
    async decrementBadge() {
        const newCount = Math.max(0, this.currentCount - 1);
        return await this.setBadge(newCount);
    }

    // Dispatch custom event for badge updates
    dispatchBadgeUpdateEvent(count) {
        const event = new CustomEvent('badgeUpdate', {
            detail: {
                count: count,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }

    // Handle notification updates from your system
    handleNotificationUpdate(detail) {
        if (detail && typeof detail.unreadCount !== 'undefined') {
            this.setBadge(detail.unreadCount);
        }
    }

    // Get current badge status
    getStatus() {
        return {
            supported: this.supported,
            initialized: this.initialized,
            currentCount: this.currentCount,
            permission: Notification.permission
        };
    }

    // Test the badging system
    async testBadging() {
        console.group('🧪 Testing App Badging');
        
        console.log('Status:', this.getStatus());
        
        // Test setting badge
        await this.setBadge(3);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test clearing badge
        await this.clearBadge();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test increment
        await this.incrementBadge();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Final clear
        await this.clearBadge();
        
        console.groupEnd();
        console.log('✅ Badging test completed');
    }
}

// ===== GLOBAL SETUP =====

// Create and initialize global badging manager
window.badgingManager = new AppBadgingManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await window.badgingManager.init();
        
        // Initial badge update
        setTimeout(() => {
            window.badgingManager.updateBadgeFromNotifications();
        }, 2000);
    });
} else {
    window.badgingManager.init().then(() => {
        setTimeout(() => {
            window.badgingManager.updateBadgeFromNotifications();
        }, 2000);
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppBadgingManager;
}