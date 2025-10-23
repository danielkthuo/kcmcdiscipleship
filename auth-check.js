// ✅ auth-check.js - COMPLETE VERSION WITH FIRESTORE
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🔧 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC8yqqIrJeUjnXRH2VBursxfiGnmqGLwxQ",
  authDomain: "kcmcpathlight.firebaseapp.com",
  projectId: "kcmcpathlight",
  storageBucket: "kcmcpathlight.appspot.com",
  messagingSenderId: "469006859881",
  appId: "1:469006859881:web:0320573397120718bdecf8"
};

// 🧭 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log("🔐 Firebase initialized for auth check...");

// 🚦 Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User authenticated:", user.email);
    // Optionally, store session info
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
  } else {
    console.warn("🚫 No user detected — redirecting to login...");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");

    // Store intended URL so user can return here after login
    sessionStorage.setItem("redirectUrl", window.location.href);

    // Redirect to login page after short delay (for smooth experience)
    setTimeout(() => {
      window.location.href = "login.html";
    }, 500);
  }
});
