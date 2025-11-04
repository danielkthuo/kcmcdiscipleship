// sw-badging.js - Service Worker Badging Operations
class ServiceWorkerBadging {
    constructor() {
        this.init();
    }

    init() {
        console.log('Service Worker Badging system initialized');
        
        // Listen for badge updates from main app
        self.addEventListener('message', this.handleBadgeMessages.bind(this));
        
        // Handle push notifications with badging
        self.addEventListener('push', this.handlePushWithBadge.bind(this));
        
        // Handle notification clicks with badge updates
        self.addEventListener('notificationclick', this.handleNotificationClickWithBadge.bind(this));
    }

    // Handle badge-related messages from main app
    async handleBadgeMessages(event) {
        const { type, count } = event.data;
        
        switch (type) {
            case 'UPDATE_BADGE':
                await this.updateBadge(count);
                break;
                
            case 'CLEAR_BADGE':
                await this.clearBadge();
                break;
                
            case 'INCREMENT_BADGE':
                await this.incrementBadge();
                break;
                
            case 'SYNC_BADGE_STATE':
                await this.syncBadgeState();
                break;
        }
    }

    // Update badge from service worker
    async updateBadge(count = 0) {
        try {
            const clients = await self.clients.matchAll();
            
            if (count > 0) {
                // Set badge on all clients
                for (const client of clients) {
                    client.postMessage({
                        type: 'SET_BADGE',
                        count: count
                    });
                }
                
                // Store badge state
                await this.storeBadgeState(count);
                console.log(`Service Worker: Badge updated to ${count}`);
                
            } else {
                // Clear badge on all clients
                for (const client of clients) {
                    client.postMessage({
                        type: 'CLEAR_BADGE'
                    });
                }
                
                await this.clearBadgeState();
                console.log('Service Worker: Badge cleared');
            }
            
        } catch (error) {
            console.error('Service Worker badge update error:', error);
        }
    }

    // Clear badge from service worker
    async clearBadge() {
        await this.updateBadge(0);
    }

    // Increment badge
    async incrementBadge() {
        const currentCount = await this.getStoredBadgeCount();
        await this.updateBadge(currentCount + 1);
    }

    // Handle push notifications with automatic badging
    async handlePushWithBadge(event) {
        // Let the main push handler run first
        // Then update badge after a short delay
        setTimeout(async () => {
            await this.incrementBadge();
        }, 1000);
    }

    // Handle notification clicks with badge updates
    async handleNotificationClickWithBadge(event) {
        // Decrement badge when notification is clicked
        setTimeout(async () => {
            await this.incrementBadge(-1); // Decrement
        }, 500);
    }

    // Store badge state in IndexedDB
    async storeBadgeState(count) {
        try {
            const db = await this.getDB();
            const transaction = db.transaction(['badgeState'], 'readwrite');
            const store = transaction.objectStore('badgeState');
            
            await store.put({
                id: 'current',
                count: count,
                updated: Date.now()
            });
            
        } catch (error) {
            console.error('Error storing badge state:', error);
        }
    }

    // Clear badge state
    async clearBadgeState() {
        await this.storeBadgeState(0);
    }

    // Get stored badge count
    async getStoredBadgeCount() {
        try {
            const db = await this.getDB();
            const transaction = db.transaction(['badgeState'], 'readonly');
            const store = transaction.objectStore('badgeState');
            const request = await store.get('current');
            
            return request.result?.count || 0;
        } catch (error) {
            console.error('Error getting badge count:', error);
            return 0;
        }
    }

    // Sync badge state with all clients
    async syncBadgeState() {
        const count = await this.getStoredBadgeCount();
        await this.updateBadge(count);
    }

    // Get IndexedDB database
    async getDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BadgeStateDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('badgeState')) {
                    db.createObjectStore('badgeState', { keyPath: 'id' });
                }
            };
        });
    }
}

// Initialize Service Worker Badging
const swBadging = new ServiceWorkerBadging();

// Export for service worker context
if (typeof self !== 'undefined') {
    self.swBadging = swBadging;
}