// ENHANCED: Save Progress to Local Storage AND Cloud
async function saveProgress() {
    const syncStatus = document.getElementById('syncStatus');
    syncStatus.innerHTML = '<i class="fas fa-sync-alt"></i><span>Syncing...</span>';
    syncStatus.className = 'sync-status syncing';
    
    // Collect completion status
    const completionStatus = {};
    document.querySelectorAll('.topic-completion').forEach((completion, index) => {
        completionStatus[`completion${index+1}`] = completion.classList.contains('topic-completed');
    });
    
    // Collect collapsible section states
    const sectionStates = {};
    document.querySelectorAll('.topic-collapsible').forEach((collapsible, index) => {
        sectionStates[`section${index+1}`] = collapsible.classList.contains('active');
    });
    
    // Collect reflection responses
    const reflections = {};
    document.querySelectorAll('.reflection textarea').forEach((textarea, index) => {
        reflections[`reflection${index+1}`] = textarea.value;
    });
    
    // Collect notes
    const notes = JSON.parse(localStorage.getItem('session1Notes') || '{}');
    
    // Save to localStorage first (for offline access)
    const progressData = {
        completionStatus,
        sectionStates,
        reflections,
        lastSaved: new Date().toISOString()
    };
    
    localStorage.setItem('session1Progress', JSON.stringify(progressData));
    
    // Try to save to cloud if user is logged in
    let cloudSuccess = false;
    if (window.saveProgressToCloud && localStorage.getItem("isLoggedIn") === "true") {
        const sessionData = {
            session1Progress: progressData,
            session1Notes: notes
        };
        cloudSuccess = await window.saveProgressToCloud(sessionData);
    }
    
    // Update sync status based on cloud save result
    setTimeout(() => {
        if (cloudSuccess) {
            syncStatus.innerHTML = '<i class="fas fa-cloud"></i><span>Cloud Synced</span>';
            syncStatus.className = 'sync-status synced';
            showNotification('Progress saved to cloud', 'success');
        } else if (localStorage.getItem("isLoggedIn") === "true") {
            syncStatus.innerHTML = '<i class="fas fa-laptop"></i><span>Local Only</span>';
            syncStatus.className = 'sync-status local';
            showNotification('Saved locally (offline)', 'warning');
        } else {
            syncStatus.innerHTML = '<i class="fas fa-user-slash"></i><span>Local Only</span>';
            syncStatus.className = 'sync-status offline';
            showNotification('Not logged in - saving locally', 'warning');
        }
    }, 800);
}

// ENHANCED: Load Progress from Local Storage (cloud data loads automatically via auth-check.js)
function loadProgress() {
    // Always try to load from localStorage first (fastest)
    const savedProgress = localStorage.getItem('session1Progress');
    const savedNotes = localStorage.getItem('session1Notes');
    
    if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        
        // Load completion status
        if (progressData.completionStatus) {
            Object.keys(progressData.completionStatus).forEach(key => {
                const completionElements = document.querySelectorAll('.topic-completion');
                const index = parseInt(key.replace('completion', '')) - 1;
                if (completionElements[index] && progressData.completionStatus[key]) {
                    completionElements[index].classList.add('topic-completed');
                }
            });
        }
        
        // Load section states
        if (progressData.sectionStates) {
            Object.keys(progressData.sectionStates).forEach(key => {
                const index = parseInt(key.replace('section', '')) - 1;
                const collapsibles = document.querySelectorAll('.topic-collapsible');
                const contents = document.querySelectorAll('.topic-content');
                
                if (collapsibles[index] && contents[index] && progressData.sectionStates[key]) {
                    collapsibles[index].classList.add('active');
                    contents[index].style.maxHeight = '70vh';
                }
            });
        }
        
        // Load reflection responses
        if (progressData.reflections) {
            Object.keys(progressData.reflections).forEach(key => {
                const textareas = document.querySelectorAll('.reflection textarea');
                const index = parseInt(key.replace('reflection', '')) - 1;
                if (textareas[index]) {
                    textareas[index].value = progressData.reflections[key];
                }
            });
        }
        
        updateProgressBar();
        updateTopicStatus();
    }
    
    // Load notes if they exist
    if (savedNotes) {
        const notesData = JSON.parse(savedNotes);
        Object.keys(notesData).forEach(noteId => {
            const container = document.getElementById(`${noteId}-notes`);
            if (container) {
                loadNotes(noteId, container);
            }
        });
    }
}