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