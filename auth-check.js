// ✅ auth-check.js - COMPLETE VERSION WITH FIRESTORE
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    
    // Load cloud data when user logs in
    loadProgressFromCloud();
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

// ☁️ Save progress to cloud
window.saveProgressToCloud = async function(sessionData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ No user logged in - cannot save to cloud");
      return false;
    }

    console.log("💾 Saving to cloud for user:", user.email);
    
    const userDocRef = doc(db, "userProgress", user.uid);
    await setDoc(userDocRef, {
      lastUpdated: new Date().toISOString(),
      email: user.email,
      ...sessionData
    }, { merge: true });
    
    console.log("✅ Progress saved to cloud successfully");
    return true;
  } catch (error) {
    console.error("❌ Error saving to cloud:", error);
    return false;
  }
};

// 📥 Load progress from cloud
async function loadProgressFromCloud() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ No user logged in - cannot load from cloud");
      return;
    }

    console.log("📥 Loading from cloud for user:", user.email);
    
    const userDocRef = doc(db, "userProgress", user.uid);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      console.log("✅ Cloud data loaded:", cloudData);
      
      // Merge cloud data with local storage
      mergeCloudData(cloudData);
      
      // Trigger UI update
      if (window.loadProgress) {
        console.log("🔄 Calling loadProgress to update UI");
        window.loadProgress();
      } else {
        console.log("⚠️ window.loadProgress not available yet");
      }
    } else {
      console.log("📭 No cloud data found for user");
    }
  } catch (error) {
    console.error("❌ Error loading from cloud:", error);
  }
}

// 🔄 Merge cloud data with local storage
function mergeCloudData(cloudData) {
  console.log("🔄 Starting cloud data merge...");
  
  // Merge session1 progress
  if (cloudData.session1Progress) {
    console.log("📁 Merging session1Progress from cloud");
    const localProgress = localStorage.getItem('session1Progress');
    
    if (localProgress) {
      // If we have both cloud and local data, merge them
      const localData = JSON.parse(localProgress);
      const cloudProgress = cloudData.session1Progress;
      
      // Create merged data - cloud data as base, local data overwrites for conflicts
      const mergedData = {
        completionStatus: { ...cloudProgress.completionStatus, ...localData.completionStatus },
        sectionStates: { ...cloudProgress.sectionStates, ...localData.sectionStates },
        reflections: { ...cloudProgress.reflections, ...localData.reflections },
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem('session1Progress', JSON.stringify(mergedData));
      console.log("✅ Merged session1Progress (cloud + local)");
    } else {
      // If no local data, just use cloud data
      localStorage.setItem('session1Progress', JSON.stringify(cloudData.session1Progress));
      console.log("✅ Loaded session1Progress from cloud (no local data)");
    }
  }
  
  // Merge session1 notes
  if (cloudData.session1Notes) {
    console.log("📝 Merging session1Notes from cloud");
    const localNotes = localStorage.getItem('session1Notes');
    
    if (localNotes) {
      const localData = JSON.parse(localNotes);
      const cloudNotes = cloudData.session1Notes;
      
      // Merge notes - for each noteId, combine arrays from both sources
      const mergedNotes = { ...cloudNotes };
      Object.keys(localData).forEach(noteId => {
        if (mergedNotes[noteId]) {
          // Combine arrays and remove duplicates based on content
          const combinedNotes = [...cloudNotes[noteId], ...localData[noteId]];
          // Remove duplicates by content
          const uniqueNotes = combinedNotes.filter((note, index, self) => 
            index === self.findIndex(n => n.content === note.content)
          );
          mergedNotes[noteId] = uniqueNotes;
        } else {
          mergedNotes[noteId] = localData[noteId];
        }
      });
      
      localStorage.setItem('session1Notes', JSON.stringify(mergedNotes));
      console.log("✅ Merged session1Notes (cloud + local)");
    } else {
      localStorage.setItem('session1Notes', JSON.stringify(cloudData.session1Notes));
      console.log("✅ Loaded session1Notes from cloud (no local data)");
    }
  }
  
  console.log("🔄 Cloud data merge completed");
}

// Add manual sync function for testing
window.manualCloudSync = function() {
  console.log("🔄 Manual cloud sync triggered");
  loadProgressFromCloud();
};

// Debug function to check cloud status
window.debugCloudStatus = async function() {
  const user = auth.currentUser;
  if (!user) {
    console.log("❌ No user logged in");
    return;
  }
  
  const userDocRef = doc(db, "userProgress", user.uid);
  const docSnap = await getDoc(userDocRef);
  
  if (docSnap.exists()) {
    console.log("✅ Cloud document exists:", docSnap.data());
  } else {
    console.log("📭 No cloud document found");
  }
};