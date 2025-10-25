// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

// Export for use in other files
export { auth, db };