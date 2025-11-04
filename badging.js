// badging.js - Dedicated Badging System for KCMC Partners
class BadgingManager {
    constructor() {
        this.supported = this.checkSupport();
        this.serviceWorkerReady = false;
        this.init();
    }

    // Check browser support
    checkSupport() {
        const badgingSupported = 'setAppBadge' in navigator;
        const experimentalSupported = 'ExperimentalBadge' in window;
        
        console.log('Badging API supported:', badgingSupported);
        console.log('Experimental Badging supported:', experimentalSupported);
        
        return badgingSupported || experimentalSupported;
    }

    // Initialize badging system
    async init() {
        if (!this.supported) {
            console.log('Badging not supported - using fallbacks');
            this.initFallbacks();
            return;
        }

        // Wait for service worker to be ready
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(() => {
                this.serviceWorkerReady = true;
                console.log('Badging system ready with Service Worker');
            });
        }

        // Request permission if needed
        await this.requestPermission();
        
        console.log('Badging system initialized');
    }

    // Set app icon badge
    async setBadge(count = 0) {
        if (!this.supported) {
            this.setFallbackBadge(count);
            return;
        }

        try {
            if (count > 0) {
                if ('setAppBadge' in navigator) {
                    await navigator.setAppBadge(count);
                } else if ('ExperimentalBadge' in window) {
                    await navigator.experimental.setAppBadge(count);
                }
                console.log(`🔔 Badge set to: ${count}`);
            } else {
                await this.clearBadge();
            }

            // Sync with service worker
            this.syncWithServiceWorker(count);
            
        } catch (error) {
            console.error('Error setting badge:', error);
            this.setFallbackBadge(count);
        }
    }

    // Clear app icon badge
    async clearBadge() {
        if (!this.supported) {
            this.clearFallbackBadge();
            return;
        }

        try {
            if ('clearAppBadge' in navigator) {
                await navigator.clearAppBadge();
            } else if ('ExperimentalBadge' in window) {
                await navigator.experimental.clearAppBadge();
            }
            console.log('🔔 Badge cleared');

            // Sync with service worker
            this.syncWithServiceWorker(0);
            
        } catch (error) {
            console.error('Error clearing badge:', error);
            this.clearFallbackBadge();
        }
    }

    // Increment badge count
    async incrementBadge() {
        const currentCount = await this.getCurrentBadgeCount();
        await this.setBadge(currentCount + 1);
    }

    // Decrement badge count
    async decrementBadge() {
        const currentCount = await this.getCurrentBadgeCount();
        await this.setBadge(Math.max(0, currentCount - 1));
    }

    // Get current badge count (estimation)
    async getCurrentBadgeCount() {
        // This is an estimation since we can't read the actual badge value
        // We'll track it in localStorage
        return parseInt(localStorage.getItem('kcmc_badge_count') || '0');
    }

    // Sync with service worker
    syncWithServiceWorker(count) {
        if (this.serviceWorkerReady && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_BADGE',
                count: count
            });
        }

        // Store in localStorage for persistence
        localStorage.setItem('kcmc_badge_count', count.toString());
    }

    // Request permission for badging
    async requestPermission() {
        if ('permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({ name: 'notifications' });
                console.log('Badge permission state:', result.state);
                return result.state === 'granted';
            } catch (error) {
                console.log('Badge permission API not available');
                return true;
            }
        }
        return true;
    }

    // ===== FALLBACK METHODS =====

    initFallbacks() {
        console.log('Initializing fallback badging methods');
        // Initialize any fallback systems here
    }

    setFallbackBadge(count) {
        console.log(`Using fallback badge: ${count}`);
        
        // Method 1: Update document title
        this.updateTitleBadge(count);
        
        // Method 2: Update favicon
        this.updateFaviconBadge(count);
        
        // Method 3: Use localStorage for cross-tab sync
        localStorage.setItem('kcmc_fallback_badge', count.toString());
        
        // Method 4: Broadcast to other tabs
        this.broadcastBadgeUpdate(count);
    }

    clearFallbackBadge() {
        this.updateTitleBadge(0);
        this.resetFavicon();
        localStorage.removeItem('kcmc_fallback_badge');
        this.broadcastBadgeUpdate(0);
    }

    updateTitleBadge(count) {
        if (count > 0) {
            document.title = `(${count}) KCMC Partners`;
        } else {
            document.title = 'KCMC Partners';
        }
    }

    updateFaviconBadge(count) {
        if (count <= 0) {
            this.resetFavicon();
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Create favicon with badge
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 32, 32);
            
            // Draw red circle badge
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(26, 6, 6, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw count text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const displayCount = count > 9 ? '9+' : count.toString();
            ctx.fillText(displayCount, 26, 6);
            
            // Update favicon
            this.updateFavicon(canvas.toDataURL());
        };
        
        img.src = '/icons/icon-192x192.png';
    }

    updateFavicon(url) {
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url;
    }

    resetFavicon() {
        const link = document.querySelector("link[rel*='icon']");
        if (link) {
            link.href = '/icons/favicon.ico';
        }
    }

    broadcastBadgeUpdate(count) {
        // Broadcast to other tabs using BroadcastChannel or localStorage
        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('kcmc_badge_updates');
            channel.postMessage({ type: 'BADGE_UPDATE', count: count });
        }
        
        // Also use localStorage for wider support
        localStorage.setItem('kcmc_badge_broadcast', Date.now().toString());
        localStorage.setItem('kcmc_badge_count', count.toString());
    }

    // ===== INTEGRATION WITH NOTIFICATION SYSTEM =====

    // Call this when a new notification arrives
    async onNewNotification(notification) {
        await this.incrementBadge();
        console.log('Badge updated for new notification');
    }

    // Call this when notifications are read
    async onNotificationsRead(count = 0) {
        await this.setBadge(count);
        console.log('Badge updated after reading notifications');
    }

    // Call this when all notifications are read
    async onAllNotificationsRead() {
        await this.clearBadge();
        console.log('Badge cleared - all notifications read');
    }

    // ===== UTILITY METHODS =====

    // Test the badging system
    async testBadge() {
        console.log('Testing badging system...');
        
        await this.setBadge(3);
        setTimeout(async () => {
            await this.setBadge(1);
            setTimeout(async () => {
                await this.clearBadge();
                console.log('Badge test completed');
            }, 2000);
        }, 2000);
    }

    // Get badging system status
    getStatus() {
        return {
            supported: this.supported,
            serviceWorkerReady: this.serviceWorkerReady,
            currentCount: localStorage.getItem('kcmc_badge_count') || 0
        };
    }
}

// Initialize global badging manager
window.badgingManager = new BadgingManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgingManager;
}