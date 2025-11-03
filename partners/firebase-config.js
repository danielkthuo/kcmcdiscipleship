// Import the functions you need from the SDKs you need
// Import the compat versions for consistency
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js";
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDfNX8WUWfUAN-dIUtzq8gJXjh0CIZdS_0",
    authDomain: "kcmcpartners.firebaseapp.com",
    projectId: "kcmcpartners",
    storageBucket: "kcmcpartners.firebasestorage.app",
    messagingSenderId: "30984885444",
    appId: "1:30984885444:web:0be4febff8cfef1b22a591",
    measurementId: "G-Z6FMF6Z1V1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enhanced authentication functions
export { auth, db };

// Enhanced user management functions
export const userService = {
    // Create new user with email and password
    async createUser(email, password, userData = {}) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Create user document in Firestore
            const userDoc = {
                email: user.email,
                name: userData.name || user.email.split('@')[0],
                role: userData.role || 'partner',
                createdAt: new Date(),
                lastLogin: new Date(),
                status: 'active',
                ...userData
            };

            await db.collection('users').doc(user.uid).set(userDoc);
            return { user, userData: userDoc };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // Get user role from Firestore
    async getUserRole(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                return userDoc.data();
            }
            return { role: 'partner', name: 'Partner' };
        } catch (error) {
            console.error('Error getting user role:', error);
            return { role: 'partner', name: 'Partner' };
        }
    },

    // Create user document in Firestore
    async createUserDocument(user, role = 'partner') {
        try {
            const userData = {
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                role: role,
                createdAt: new Date(),
                lastLogin: new Date(),
                status: 'active'
            };

            await db.collection('users').doc(user.uid).set(userData);
            return userData;
        } catch (error) {
            console.error('Error creating user document:', error);
            throw error;
        }
    },

    // Update user last login
    async updateLastLogin(uid) {
        try {
            await db.collection('users').doc(uid).update({
                lastLogin: new Date()
            });
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }
};
// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Notification Service
const notificationService = {
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    permission: null,
    token: null,

    // Initialize notifications
    async initialize() {
        if (!this.isSupported) {
            console.log('Notifications not supported');
            return;
        }

        this.permission = Notification.permission;
        
        if (this.permission === 'default') {
            // Show notification prompt after user logs in
            setTimeout(() => this.showPermissionPrompt(), 3000);
        } else if (this.permission === 'granted') {
            await this.getToken();
            this.setupMessageHandling();
        }

        // Load existing notifications
        this.loadNotifications();
    },

    // Show permission prompt
    showPermissionPrompt() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.role !== 'visitor') {
            document.getElementById('notificationPrompt').style.display = 'block';
        }
    },

    // Hide permission prompt
    hidePermissionPrompt() {
        document.getElementById('notificationPrompt').style.display = 'none';
    },

    // Enable notifications
    async enableNotifications() {
        try {
            this.permission = await Notification.requestPermission();
            
            if (this.permission === 'granted') {
                console.log('Notification permission granted');
                await this.getToken();
                this.setupMessageHandling();
                this.hidePermissionPrompt();
                showNotification('Notifications enabled successfully!', 'success');
            } else {
                console.log('Notification permission denied');
                showNotification('Notifications were not enabled', 'info');
            }
        } catch (error) {
            console.error('Error enabling notifications:', error);
            showNotification('Error enabling notifications', 'error');
        }
    },

    // Get FCM token
    async getToken() {
        try {
            // Use your VAPID key here (you need to generate this in Firebase Console)
            const vapidKey = 'YOUR_VAPID_KEY_HERE'; // Replace with your actual VAPID key
            
            this.token = await messaging.getToken({ 
                vapidKey: vapidKey 
            });
            
            if (this.token) {
                console.log('FCM token:', this.token);
                await this.saveTokenToFirestore(this.token);
                return this.token;
            } else {
                console.log('No registration token available.');
                return null;
            }
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    },

    // Save token to Firestore
    async saveTokenToFirestore(token) {
        try {
            const user = auth.currentUser;
            if (user) {
                await db.collection('userTokens').doc(user.uid).set({
                    token: token,
                    userId: user.uid,
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log('Token saved to Firestore');
            }
        } catch (error) {
            console.error('Error saving token to Firestore:', error);
        }
    },

    // Setup message handling
    setupMessageHandling() {
        // Handle foreground messages
        messaging.onMessage((payload) => {
            console.log('Foreground message received: ', payload);
            this.showLocalNotification(payload);
            this.loadNotifications(); // Refresh notifications list
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                console.log('Notification clicked with data:', event.data);
                this.handleNotificationClick(event.data.data);
            }
        });
    },

    // Show local notification
    showLocalNotification(payload) {
        const title = payload.data?.title || payload.notification?.title || 'KCMC Partners';
        const body = payload.data?.body || payload.notification?.body || 'New message';
        
        // Save notification to local storage
        this.saveNotification({
            id: payload.data?.messageId || Date.now().toString(),
            title: title,
            body: body,
            timestamp: new Date().toISOString(),
            read: false,
            data: payload.data || {}
        });

        // Update notification count
        this.updateNotificationCount();

        // Show in-app notification
        showNotification(`📢 ${title}: ${body}`, 'info');
    },

    // Save notification to local storage
    saveNotification(notification) {
        let notifications = JSON.parse(localStorage.getItem('kcmc_notifications') || '[]');
        
        // Check if notification already exists
        const existingIndex = notifications.findIndex(n => n.id === notification.id);
        if (existingIndex > -1) {
            notifications[existingIndex] = notification;
        } else {
            notifications.unshift(notification); // Add to beginning
        }
        
        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications = notifications.slice(0, 50);
        }
        
        localStorage.setItem('kcmc_notifications', JSON.stringify(notifications));
    },

    // Load notifications from local storage
    loadNotifications() {
        const notifications = JSON.parse(localStorage.getItem('kcmc_notifications') || '[]');
        this.updateNotificationCount();
        return notifications;
    },

    // Update notification count badge
    updateNotificationCount() {
        const notifications = this.loadNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;
        const countElement = document.getElementById('notificationCount');
        
        if (countElement) {
            if (unreadCount > 0) {
                countElement.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
                countElement.style.display = 'flex';
            } else {
                countElement.style.display = 'none';
            }
        }
    },

    // Mark notification as read
    markAsRead(notificationId) {
        let notifications = this.loadNotifications();
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification && !notification.read) {
            notification.read = true;
            localStorage.setItem('kcmc_notifications', JSON.stringify(notifications));
            this.updateNotificationCount();
        }
    },

    // Mark all notifications as read
    markAllAsRead() {
        let notifications = this.loadNotifications();
        notifications.forEach(notification => {
            notification.read = true;
        });
        localStorage.setItem('kcmc_notifications', JSON.stringify(notifications));
        this.updateNotificationCount();
        this.showNotificationsPanel(); // Refresh the panel
    },

    // Clear all notifications
    clearAllNotifications() {
        localStorage.removeItem('kcmc_notifications');
        this.updateNotificationCount();
        this.showNotificationsPanel(); // Refresh the panel
    },

    // Show notifications panel
    showNotificationsPanel() {
        const notifications = this.loadNotifications();
        const listElement = document.getElementById('notificationsList');
        
        if (notifications.length === 0) {
            listElement.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--gray);">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No notifications yet</p>
                </div>
            `;
        } else {
            listElement.innerHTML = notifications.map(notification => `
                <div class="notification-item ${notification.read ? '' : 'unread'}" 
                     onclick="notificationService.handleNotificationClick(${JSON.stringify(notification.data).replace(/"/g, '&quot;')})">
                    <div class="notification-header">
                        <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                        <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                    </div>
                    <div class="notification-body">${this.escapeHtml(notification.body)}</div>
                    <div class="notification-actions">
                        ${!notification.read ? `
                            <button onclick="event.stopPropagation(); notificationService.markAsRead('${notification.id}')">
                                Mark as Read
                            </button>
                        ` : ''}
                        <button onclick="event.stopPropagation(); notificationService.deleteNotification('${notification.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        document.getElementById('notificationsPanel').style.display = 'block';
    },

    // Hide notifications panel
    hideNotificationsPanel() {
        document.getElementById('notificationsPanel').style.display = 'none';
    },

    // Handle notification click
    handleNotificationClick(data) {
        console.log('Notification clicked with data:', data);
        
        // Mark as read
        if (data.messageId) {
            this.markAsRead(data.messageId);
        }
        
        // Handle different notification types
        if (data.url) {
            window.location.href = data.url;
        } else if (data.type === 'message') {
            // Navigate to messages section
            this.hideNotificationsPanel();
            // You can add specific navigation logic here
        }
        
        // Close notifications panel
        this.hideNotificationsPanel();
    },

    // Delete single notification
    deleteNotification(notificationId) {
        let notifications = this.loadNotifications();
        notifications = notifications.filter(n => n.id !== notificationId);
        localStorage.setItem('kcmc_notifications', JSON.stringify(notifications));
        this.updateNotificationCount();
        this.showNotificationsPanel(); // Refresh the panel
    },

    // Utility function to escape HTML
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // Format time
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
};

// Update your auth state change handler to initialize notifications
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in, get their role from Firestore
        await handleUserLogin(user);
        
        // Initialize notifications for logged-in users
        if (user.role !== 'visitor') {
            // Show notifications container
            const notificationsContainer = document.getElementById('notificationsContainer');
            if (notificationsContainer) {
                notificationsContainer.style.display = 'block';
            }
            
            // Initialize notification service
            await notificationService.initialize();
        }
    } else {
        // No user signed in
        showLoginButton();
        
        // Hide notifications container
        const notificationsContainer = document.getElementById('notificationsContainer');
        if (notificationsContainer) {
            notificationsContainer.style.display = 'none';
        }
    }
});

// Add event listeners for notification UI
document.addEventListener('DOMContentLoaded', function() {
    // Notifications bell
    const notificationsBell = document.getElementById('notificationsBell');
    if (notificationsBell) {
        notificationsBell.addEventListener('click', function(e) {
            e.preventDefault();
            notificationService.showNotificationsPanel();
        });
    }

    // Check if we're returning from a notification click
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fromNotification') === 'true') {
        // You can add specific logic for when app is opened from notification
        console.log('App opened from notification');
    }
});

// Global functions for HTML onclick handlers
function enableNotifications() {
    notificationService.enableNotifications();
}

function hideNotificationPrompt() {
    notificationService.hidePermissionPrompt();
}

function showNotificationsPanel() {
    notificationService.showNotificationsPanel();
}

function hideNotificationsPanel() {
    notificationService.hideNotificationsPanel();
}

function markAllAsRead() {
    notificationService.markAllAsRead();
}

function clearAllNotifications() {
    if (confirm('Are you sure you want to clear all notifications?')) {
        notificationService.clearAllNotifications();
    }
}

// Update service worker registration to handle updates
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
                
                // Check for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('SW update found:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, show update notification
                            showNotification('New version available! Refresh to update.', 'info');
                        }
                    });
                });
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service worker controller changed');
            window.location.reload();
        });
    });
}