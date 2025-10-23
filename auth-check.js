// ✅ Enhanced auth-check.js - Unified Firebase Sync System
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🔧 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC8yqqIrJeUjnXRH2VBursxfiGnmqGLwxQ",
  authDomain: "kcmcpathlight.firebaseapp.com",
  projectId: "kcmcpathlight",
  storageBucket: "kcmcpathlight.appspot.com",
  messagingSenderId: "469006859881",
  appId: "1:469006859881:web:0320573397120718bdecf8"
};

// 🧭 Initialize (safe)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🔐 Firebase initialized...");

// Global sync state
let isSyncing = false;
let pendingSync = false;

// 🚦 Enhanced auth state listener with progress sync
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Logged in as:", user.email);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);

    // Load progress after login with retry logic
    await loadProgressFromCloud();
    
    // Set up auto-save listeners
    setupAutoSaveListeners();
  } else {
    console.warn("🚫 Not logged in, redirecting...");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    
    const currentPage = window.location.pathname;
    if (!currentPage.includes('login.html') && !currentPage.includes('new.html') && !currentPage.includes('index.html')) {
      sessionStorage.setItem("redirectUrl", window.location.href);
      setTimeout(() => (window.location.href = "login.html"), 500);
    }
  }
});

// ☁️ Enhanced Save Progress to Firestore
window.saveProgressToCloud = async function (sessionData = null) {
  if (isSyncing) {
    pendingSync = true;
    return;
  }
  
  try {
    isSyncing = true;
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ No user logged in for cloud save");
      return false;
    }

    // Get current progress data if not provided
    if (!sessionData) {
      sessionData = getCurrentProgressData();
    }

    const userDocRef = doc(db, "userProgress", user.uid);
    await setDoc(
      userDocRef,
      {
        lastUpdated: new Date().toISOString(),
        email: user.email,
        session1Progress: sessionData,
        device: navigator.userAgent,
        lastSync: new Date().toISOString()
      },
      { merge: true }
    );
    
    console.log("✅ Progress synced to cloud");
    updateSyncStatus('synced');
    return true;
  } catch (err) {
    console.error("❌ Cloud save failed:", err);
    updateSyncStatus('error');
    return false;
  } finally {
    isSyncing = false;
    if (pendingSync) {
      pendingSync = false;
      setTimeout(() => window.saveProgressToCloud(), 1000);
    }
  }
};

// 📥 Enhanced Load and Merge Progress from Firestore
async function loadProgressFromCloud() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ No user logged in for cloud load");
      return;
    }

    const userDocRef = doc(db, "userProgress", user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      console.log("☁️ Cloud data found:", cloudData);

      // Enhanced merge with conflict resolution
      mergeCloudData(cloudData);
      
      // Update UI if loadProgress function exists
      if (window.loadProgress) {
        setTimeout(() => window.loadProgress(), 100);
      }
    } else {
      console.log("📭 No progress data in cloud");
      // Initialize cloud document with current local data
      const localData = getCurrentProgressData();
      if (localData && Object.keys(localData).length > 0) {
        await window.saveProgressToCloud(localData);
      }
    }
  } catch (err) {
    console.error("❌ Load from cloud failed:", err);
    updateSyncStatus('error');
  }
}

// 🔄 Enhanced Merge Cloud + Local Storage with Conflict Resolution
function mergeCloudData(cloudData) {
  if (!cloudData.session1Progress) return;

  const local = localStorage.getItem("session1Progress");
  const cloudProgress = cloudData.session1Progress || {};
  
  if (!local) {
    // No local data, use cloud data
    localStorage.setItem("session1Progress", JSON.stringify(cloudProgress));
    console.log("✅ Loaded cloud progress (no local data)");
    return;
  }

  const localProgress = JSON.parse(local);
  const cloudLastUpdated = new Date(cloudData.lastUpdated || 0);
  const localLastUpdated = new Date(localProgress.lastUpdated || 0);

  let merged;
  
  // Conflict resolution: Use most recently updated data
  if (cloudLastUpdated > localLastUpdated) {
    console.log("🔄 Using cloud data (newer)");
    merged = {
      ...cloudProgress,
      // Preserve any local data that might not be in cloud
      ...localProgress,
      completionStatus: { 
        ...cloudProgress.completionStatus, 
        ...localProgress.completionStatus 
      },
      lastSynced: new Date().toISOString(),
      lastUpdated: cloudData.lastUpdated
    };
  } else {
    console.log("🔄 Using local data (newer or equal)");
    merged = {
      ...localProgress,
      ...cloudProgress,
      completionStatus: { 
        ...localProgress.completionStatus, 
        ...cloudProgress.completionStatus 
      },
      lastSynced: new Date().toISOString(),
      lastUpdated: localProgress.lastUpdated
    };
  }

  localStorage.setItem("session1Progress", JSON.stringify(merged));
  console.log("✅ Merged cloud + local progress");
}

// 🛠️ Helper Functions
function getCurrentProgressData() {
  try {
    const progressData = localStorage.getItem("session1Progress");
    return progressData ? JSON.parse(progressData) : {};
  } catch (error) {
    console.error("❌ Error getting current progress:", error);
    return {};
  }
}

function updateSyncStatus(status) {
  const syncElement = document.getElementById('syncStatus');
  if (syncElement) {
    syncElement.textContent = 
      status === 'syncing' ? 'Syncing...' :
      status === 'synced' ? 'Synced' :
      status === 'error' ? 'Sync Failed' : 'Sync';
    
    syncElement.className = `sync-status ${status}`;
  }
}

function setupAutoSaveListeners() {
  // Listen for storage events (changes from other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === 'session1Progress' && e.newValue) {
      console.log('🔄 Storage change detected, reloading progress');
      if (window.loadProgress) {
        window.loadProgress();
      }
    }
  });
}

// 🎯 Export for use in other modules
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseApp = app;