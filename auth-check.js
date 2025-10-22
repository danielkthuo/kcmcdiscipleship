// ✅ auth-check.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🔧 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC8yqqIrJeUjnXRH2VBursxfiGnmqGLwxQ",
  authDomain: "kcmcpathlight.firebaseapp.com",
  projectId: "kcmcpathlight",
  storageBucket: "kcmcpathlight.firebasestorage.app",
  messagingSenderId: "469006859881",
  appId: "1:469006859881:web:0320573397120718bdecf8"
};

// 🧭 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🔐 Firebase initialized for auth check...");

// 🚦 Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User authenticated:", user.email);
    // Store session info
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);
    
    // Load user progress from Firestore
    loadUserProgress(user.uid);
    
    // Set up real-time listener for progress updates
    setupProgressListener(user.uid);
  } else {
    console.warn("🚫 No user detected — redirecting to login...");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");

    // Store intended URL so user can return here after login
    sessionStorage.setItem("redirectUrl", window.location.href);

    // Redirect to login page after short delay (for smooth experience)
    setTimeout(() => {
      window.location.href = "login.html";
    }, 500);
  }
});

// 🔄 Load user progress from Firestore
async function loadUserProgress(userId) {
  try {
    const docRef = doc(db, "userProgress", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      console.log("📥 Loaded user progress from cloud:", userData);
      
      // Store in localStorage for offline access
      if (userData.session3Progress) {
        localStorage.setItem('session3Progress', JSON.stringify(userData.session3Progress));
      }
      if (userData.session3Notes) {
        localStorage.setItem('session3Notes', JSON.stringify(userData.session3Notes));
      }
      
      // Trigger UI update
      if (window.loadProgress) {
        window.loadProgress();
      }
    } else {
      console.log("📭 No existing progress found in cloud");
    }
  } catch (error) {
    console.error("❌ Error loading progress:", error);
  }
}

// 📡 Set up real-time progress listener
function setupProgressListener(userId) {
  const docRef = doc(db, "userProgress", userId);
  
  onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      console.log("🔄 Real-time update received:", userData);
      
      // Update local storage with latest data
      if (userData.session3Progress) {
        localStorage.setItem('session3Progress', JSON.stringify(userData.session3Progress));
      }
      if (userData.session3Notes) {
        localStorage.setItem('session3Notes', JSON.stringify(userData.session3Notes));
      }
      
      // Update UI if needed
      if (window.loadProgress) {
        window.loadProgress();
      }
    }
  });
}

// 💾 Save progress to Firestore (call this from your sessions)
window.saveProgressToCloud = async function(sessionData) {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    console.warn("🚫 No user ID found - saving locally only");
    return false;
  }
  
  try {
    const docRef = doc(db, "userProgress", userId);
    
    // Merge with existing data
    const docSnap = await getDoc(docRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};
    
    const updateData = {
      ...existingData,
      ...sessionData,
      lastUpdated: new Date().toISOString(),
      email: localStorage.getItem("userEmail")
    };
    
    await setDoc(docRef, updateData);
    console.log("✅ Progress saved to cloud successfully");
    return true;
  } catch (error) {
    console.error("❌ Error saving to cloud:", error);
    return false;
  }
};

// 📤 Get cloud save function for sessions
window.getCloudSaveFunction = function() {
  return window.saveProgressToCloud;
};