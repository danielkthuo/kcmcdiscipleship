// ✅ Enhanced auth-check.js - Multi-Lesson Firebase Sync System
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

// Lesson configuration - Add new lessons here as you create them
const LESSON_CONFIG = {
  'lesson1': {
    name: 'Foundation to New Believer',
    storageKey: 'lesson1Progress',
    pagePattern: /module-lesson1\.html$/,
    defaultData: {
      topics: [],
      reflections: {},
      matchingGame: { score: 0, total: 0 },
      lastUpdated: new Date().toISOString()
    }
  },
  'lesson2': {
    name: 'Next Lesson Name', // Update this
    storageKey: 'lesson2Progress', 
    pagePattern: /module-lesson2\.html$/,
    defaultData: {
      topics: [],
      reflections: {},
      activities: {},
      lastUpdated: new Date().toISOString()
    }
  },
  'session1': {
    name: 'General Session',
    storageKey: 'session1Progress',
    defaultData: {}
  }
  // Add more lessons here following the same pattern
};

// 🚦 Enhanced auth state listener with progress sync
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Logged in as:", user.email);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);

    // Load all progress data after login
    await loadAllProgressFromCloud();
    
    // Set up auto-save listeners
    setupAutoSaveListeners();
    
    // Trigger page-specific progress loading
    triggerCurrentPageProgressLoad();
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

// ☁️ Enhanced Save Progress to Firestore - All Lessons
window.saveProgressToCloud = async function (specificLessonData = null) {
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

    // Get all progress data
    const allProgressData = getAllProgressData();
    
    // If specific lesson data provided, merge it
    if (specificLessonData) {
      Object.keys(specificLessonData).forEach(lessonKey => {
        if (allProgressData[lessonKey]) {
          allProgressData[lessonKey] = {
            ...allProgressData[lessonKey],
            ...specificLessonData[lessonKey],
            lastUpdated: new Date().toISOString()
          };
        }
      });
    }

    const userDocRef = doc(db, "userProgress", user.uid);
    await setDoc(
      userDocRef,
      {
        lastUpdated: new Date().toISOString(),
        email: user.email,
        // Save all lesson progress
        ...allProgressData,
        device: navigator.userAgent,
        lastSync: new Date().toISOString()
      },
      { merge: true }
    );
    
    console.log("✅ All progress synced to cloud:", Object.keys(allProgressData));
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

// 📥 Enhanced Load and Merge Progress from Firestore - All Lessons
async function loadAllProgressFromCloud() {
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
      console.log("☁️ Cloud data found, merging all lessons...");

      // Merge all lesson data from cloud
      mergeAllCloudData(cloudData);
      
      // Trigger progress loading for current page
      triggerCurrentPageProgressLoad();
    } else {
      console.log("📭 No progress data in cloud - initializing new user document");
      // Initialize cloud document with current local data
      const localData = getAllProgressData();
      if (Object.keys(localData).length > 0) {
        await window.saveProgressToCloud();
      }
    }
  } catch (err) {
    console.error("❌ Load from cloud failed:", err);
    updateSyncStatus('error');
  }
}

// 🔄 Enhanced Merge All Cloud Data
function mergeAllCloudData(cloudData) {
  Object.keys(LESSON_CONFIG).forEach(lessonKey => {
    const config = LESSON_CONFIG[lessonKey];
    const cloudLessonData = cloudData[config.storageKey];
    
    if (cloudLessonData) {
      mergeLessonData(config.storageKey, cloudLessonData, cloudData.lastUpdated);
    }
  });
}

// 🔄 Merge Individual Lesson Data
function mergeLessonData(storageKey, cloudLessonData, cloudLastUpdated) {
  const local = localStorage.getItem(storageKey);
  
  if (!local) {
    // No local data, use cloud data
    localStorage.setItem(storageKey, JSON.stringify(cloudLessonData));
    console.log(`✅ Loaded cloud ${storageKey} (no local data)`);
    return;
  }

  const localProgress = JSON.parse(local);
  const cloudUpdated = new Date(cloudLastUpdated || 0);
  const localUpdated = new Date(localProgress.lastUpdated || 0);

  let merged;
  
  // Conflict resolution: Use most recently updated data
  if (cloudUpdated > localUpdated) {
    console.log(`🔄 Using cloud ${storageKey} data (newer)`);
    merged = {
      ...cloudLessonData,
      ...localProgress, // Preserve local data not in cloud
      lastSynced: new Date().toISOString(),
      lastUpdated: cloudLastUpdated
    };
  } else {
    console.log(`🔄 Using local ${storageKey} data (newer or equal)`);
    merged = {
      ...localProgress,
      ...cloudLessonData, // Include cloud data
      lastSynced: new Date().toISOString(),
      lastUpdated: localProgress.lastUpdated
    };
  }

  localStorage.setItem(storageKey, JSON.stringify(merged));
  console.log(`✅ Merged cloud + local ${storageKey}`);
}

// 🛠️ Helper Functions
function getAllProgressData() {
  const allData = {};
  
  Object.keys(LESSON_CONFIG).forEach(lessonKey => {
    const config = LESSON_CONFIG[lessonKey];
    try {
      const progressData = localStorage.getItem(config.storageKey);
      allData[config.storageKey] = progressData ? JSON.parse(progressData) : config.defaultData;
    } catch (error) {
      console.error(`❌ Error getting ${config.storageKey}:`, error);
      allData[config.storageKey] = config.defaultData;
    }
  });
  
  return allData;
}

function getCurrentLessonConfig() {
  const currentPath = window.location.pathname;
  
  for (const [lessonKey, config] of Object.entries(LESSON_CONFIG)) {
    if (config.pagePattern && config.pagePattern.test(currentPath)) {
      return config;
    }
  }
  
  return null;
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
    console.log('🔄 Storage change detected:', e.key);
    if (e.key && e.key.endsWith('Progress') && e.newValue) {
      triggerCurrentPageProgressLoad();
    }
  });
}

function triggerCurrentPageProgressLoad() {
  const currentLesson = getCurrentLessonConfig();
  
  if (currentLesson) {
    console.log(`📚 ${currentLesson.name} page detected, loading progress...`);
    
    // Wait for page to load, then trigger progress loading
    setTimeout(() => {
      const savedProgress = localStorage.getItem(currentLesson.storageKey);
      if (savedProgress) {
        console.log(`🔄 Loading ${currentLesson.storageKey} progress`);
        
        // Use page-specific load function if available
        if (window.loadProgress && typeof window.loadProgress === 'function') {
          window.loadProgress(JSON.parse(savedProgress));
        } else if (window.manualLoadProgress && typeof window.manualLoadProgress === 'function') {
          window.manualLoadProgress(JSON.parse(savedProgress));
        } else {
          console.log(`ℹ️ No progress loader found for ${currentLesson.name}`);
        }
      }
    }, 1000);
  }
}

// 🎯 Export for use in other modules
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseApp = app;
window.getCurrentLessonConfig = getCurrentLessonConfig;
window.getAllProgressData = getAllProgressData;