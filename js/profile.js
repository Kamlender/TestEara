/**
 * TestEara — Profile & Settings
 * Loads user profile data and populates the profile view.
 * Save logic is in auth.js (saveProfile function).
 */


// ===== LOAD PROFILE =====
async function loadProfile() {
  if (!currentUser) return;

  // Set basic info from Firebase Auth
  const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  const email = currentUser.email || '';
  const initial = name.charAt(0).toUpperCase();

  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileDisplayName = document.getElementById('profileDisplayName');

  if (profileName) profileName.textContent = name;
  if (profileEmail) profileEmail.textContent = email;
  if (profileAvatar) profileAvatar.textContent = initial;
  if (profileDisplayName) profileDisplayName.value = currentUser.displayName || '';

  // Load saved preferences from Firestore
  if (db) {
    try {
      const doc = await db.collection('users').doc(currentUser.uid).get();
      if (doc.exists) {
        const data = doc.data();
        const examSelect = document.getElementById('profileDefaultExam');
        const catSelect = document.getElementById('profileCategory');
        
        if (data.defaultExam && examSelect) examSelect.value = data.defaultExam;
        if (data.category && catSelect) catSelect.value = data.category;
      }
    } catch (e) {
      console.warn('Load profile error:', e);
    }
  }
}


// ===== UPDATE USER INFO (called from auth.js) =====
function updateUserInfo(user) {
  if (!user) return;

  const name = user.displayName || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const initial = name.charAt(0).toUpperCase();

  // Update sidebar
  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarEmail = document.getElementById('sidebarUserEmail');
  const sidebarAvatar = document.getElementById('sidebarAvatar');

  if (sidebarName) sidebarName.textContent = name;
  if (sidebarEmail) sidebarEmail.textContent = email;
  if (sidebarAvatar) sidebarAvatar.textContent = initial;
}


// ===== GET USER CATEGORY (for cutoff analysis) =====
function getUserCategory() {
  const catSelect = document.getElementById('profileCategory');
  return catSelect?.value || 'general';
}


// ===== INIT PROFILE VIEW =====
function initProfile() {
  loadProfile();
}
