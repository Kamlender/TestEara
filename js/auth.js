/**
 * TestEra — Authentication Module
 * Handles email/password auth, Google sign-in, password reset,
 * auth state management, and protected route logic.
 */

// ===== AUTH STATE =====
let currentUser = null;

/**
 * Initialize authentication — sets up auth state listener
 * Call this on every page load
 */
function initAuth() {
  if (!isFirebaseConfigured()) {
    console.warn('⚠️ Auth skipped — Firebase not configured');
    handleDemoMode();
    return;
  }

  if (!auth) {
    console.error('❌ Firebase auth not initialized');
    return;
  }

  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    currentUser = user;

    if (user) {
      console.log('✅ User signed in:', user.email);
      onUserSignedIn(user);
    } else {
      console.log('👤 No user signed in');
      onUserSignedOut();
    }
  });
}


// ===== SIGN UP (Email/Password) =====
async function signUpWithEmail(name, email, password) {
  if (!isFirebaseConfigured()) {
    showToast('Firebase not configured. Add your config keys to js/firebase-config.js', 'warning');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    // Validate inputs
    if (!name || name.trim().length < 2) {
      throw new Error('Please enter your full name (at least 2 characters).');
    }
    if (!email || !isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Show loading state
    setAuthButtonLoading('btnEmailSignup', true);

    // Create user
    const credential = await auth.createUserWithEmailAndPassword(email, password);

    // Update display name
    await credential.user.updateProfile({
      displayName: name.trim()
    });

    // Create user document in Firestore
    await createUserDocument(credential.user, name.trim());

    showToast('Account created successfully! 🎉', 'success');

    return { success: true, user: credential.user };
  } catch (error) {
    const friendlyError = getFriendlyAuthError(error);
    showToast(friendlyError, 'error');
    return { success: false, error: friendlyError };
  } finally {
    setAuthButtonLoading('btnEmailSignup', false);
  }
}


// ===== LOG IN (Email/Password) =====
async function loginWithEmail(email, password) {
  if (!isFirebaseConfigured()) {
    showToast('Firebase not configured. Add your config keys to js/firebase-config.js', 'warning');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    if (!email || !isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    // Show loading state
    setAuthButtonLoading('btnEmailLogin', true);

    const credential = await auth.signInWithEmailAndPassword(email, password);

    showToast('Welcome back! 👋', 'success');

    return { success: true, user: credential.user };
  } catch (error) {
    const friendlyError = getFriendlyAuthError(error);
    showToast(friendlyError, 'error');
    return { success: false, error: friendlyError };
  } finally {
    setAuthButtonLoading('btnEmailLogin', false);
  }
}


// ===== GOOGLE SIGN IN =====
async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    showToast('Firebase not configured. Add your config keys to js/firebase-config.js', 'warning');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    // Use popup for desktop, redirect for mobile
    let credential;
    if (window.innerWidth < 768) {
      await auth.signInWithRedirect(provider);
      return { success: true }; // Will redirect
    } else {
      credential = await auth.signInWithPopup(provider);
    }

    // Check if new user → create Firestore doc
    if (credential.additionalUserInfo?.isNewUser) {
      await createUserDocument(credential.user);
      showToast('Account created! Welcome to TestEra! 🎉', 'success');
    } else {
      showToast('Welcome back! 👋', 'success');
    }

    return { success: true, user: credential.user };
  } catch (error) {
    // Don't show error for popup closed by user
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      return { success: false, error: 'cancelled' };
    }
    const friendlyError = getFriendlyAuthError(error);
    showToast(friendlyError, 'error');
    return { success: false, error: friendlyError };
  }
}


// ===== PASSWORD RESET =====
async function sendPasswordReset(email) {
  if (!isFirebaseConfigured()) {
    showToast('Firebase not configured.', 'warning');
    return { success: false };
  }

  try {
    if (!email || !isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }

    setAuthButtonLoading('btnSendReset', true);

    await auth.sendPasswordResetEmail(email);

    showToast('Password reset email sent! Check your inbox. 📧', 'success');
    return { success: true };
  } catch (error) {
    const friendlyError = getFriendlyAuthError(error);
    showToast(friendlyError, 'error');
    return { success: false, error: friendlyError };
  } finally {
    setAuthButtonLoading('btnSendReset', false);
  }
}


// ===== LOGOUT =====
async function logOut() {
  try {
    await auth.signOut();
    showToast('Logged out successfully.', 'info');
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Logout failed. Please try again.', 'error');
  }
}


// ===== AUTH STATE HANDLERS =====

/**
 * Called when a user signs in.
 * Handles redirect logic + UI updates.
 */
function onUserSignedIn(user) {
  currentUser = user;

  // If on landing page → redirect to app
  const isLandingPage = window.location.pathname.endsWith('index.html') ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');

  // Check if we're on a page with modals (landing page)
  const loginModal = document.getElementById('loginModal');
  const signupModal = document.getElementById('signupModal');
  if (loginModal) closeModal('loginModal');
  if (signupModal) closeModal('signupModal');

  if (isLandingPage) {
    // Redirect to app after short delay for toast to show
    setTimeout(() => {
      window.location.href = 'app.html';
    }, 500);
    return;
  }

  // If on app page → update UI with user info
  if (typeof updateUserInfo === 'function') {
    updateUserInfo(user);
  }

  // Update nav buttons on landing page
  updateAuthNavButtons(true);
}

/**
 * Called when user signs out.
 * Handles redirect from protected pages.
 */
function onUserSignedOut() {
  currentUser = null;

  const isAppPage = window.location.pathname.endsWith('app.html');

  if (isAppPage) {
    // Redirect to landing page
    window.location.href = 'index.html';
    return;
  }

  // Update nav buttons
  updateAuthNavButtons(false);
}


// ===== DEMO MODE =====
// When Firebase is not configured, allow exploring the UI
function handleDemoMode() {
  const isAppPage = window.location.pathname.endsWith('app.html');

  if (isAppPage) {
    // In demo mode, show a demo user
    if (typeof updateUserInfo === 'function') {
      updateUserInfo({
        displayName: 'Demo User',
        email: 'demo@testera.app',
        uid: 'demo-user'
      });
    }
  }
}


// ===== CREATE USER DOCUMENT IN FIRESTORE =====
async function createUserDocument(user, displayName) {
  if (!db) return;

  try {
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        displayName: displayName || user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        defaultExam: '',
        category: 'general',
        testsCreated: 0,
        testsAttempted: 0
      });
      console.log('📄 User document created in Firestore');
    }
  } catch (error) {
    console.error('Error creating user document:', error);
    // Non-critical — don't block auth flow
  }
}


// ===== UI HELPERS =====

/**
 * Update nav auth buttons (Login/Signup vs User avatar)
 */
function updateAuthNavButtons(isSignedIn) {
  const btnLogin = document.getElementById('btnLogin');
  const btnSignup = document.getElementById('btnSignup');
  const navAuth = document.querySelector('.nav-auth');

  if (!navAuth) return;

  if (isSignedIn && currentUser) {
    const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    const initial = name.charAt(0).toUpperCase();

    navAuth.innerHTML = `
      <a href="app.html" class="btn btn-primary">
        <i class="fas fa-th-large"></i>
        Go to Dashboard
      </a>
    `;
  } else {
    // Restore original buttons if they were replaced
    if (!btnLogin && !btnSignup) {
      navAuth.innerHTML = `
        <button class="btn btn-ghost" id="btnLogin" onclick="openModal('loginModal')">Log In</button>
        <button class="btn btn-primary" id="btnSignup" onclick="openModal('signupModal')">
          Get Started Free
        </button>
      `;
    }
  }
}

/**
 * Set button loading state
 */
function setAuthButtonLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Please wait...';
    btn.style.opacity = '0.7';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.style.opacity = '1';
  }
}


// ===== FORM EVENT WIRING =====

/**
 * Wire up all auth forms and buttons.
 * Call this after DOM is loaded.
 */
function initAuthForms() {
  // === Email Signup ===
  const btnEmailSignup = document.getElementById('btnEmailSignup');
  if (btnEmailSignup) {
    btnEmailSignup.addEventListener('click', async () => {
      const name = document.getElementById('signupName')?.value;
      const email = document.getElementById('signupEmail')?.value;
      const password = document.getElementById('signupPassword')?.value;
      await signUpWithEmail(name, email, password);
    });
  }

  // === Email Login ===
  const btnEmailLogin = document.getElementById('btnEmailLogin');
  if (btnEmailLogin) {
    btnEmailLogin.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail')?.value;
      const password = document.getElementById('loginPassword')?.value;
      await loginWithEmail(email, password);
    });
  }

  // === Google Sign In (all Google buttons) ===
  const btnGoogleLogin = document.getElementById('btnGoogleLogin');
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', signInWithGoogle);
  }

  const btnGoogleSignup = document.getElementById('btnGoogleSignup');
  if (btnGoogleSignup) {
    btnGoogleSignup.addEventListener('click', signInWithGoogle);
  }

  // === Password Reset ===
  const btnSendReset = document.getElementById('btnSendReset');
  if (btnSendReset) {
    btnSendReset.addEventListener('click', async () => {
      const email = document.getElementById('resetEmail')?.value;
      await sendPasswordReset(email);
    });
  }

  // === Forgot Password Link ===
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('loginModal');
      openModal('resetModal');
      // Pre-fill email if available
      const loginEmail = document.getElementById('loginEmail')?.value;
      const resetEmail = document.getElementById('resetEmail');
      if (loginEmail && resetEmail) {
        resetEmail.value = loginEmail;
      }
    });
  }

  // === Logout ===
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      logOut();
    });
  }

  // === Save Profile ===
  const btnSaveProfile = document.getElementById('btnSaveProfile');
  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', saveProfile);
  }

  // === Enter key submits forms ===
  setupEnterKeySubmit('loginPassword', 'btnEmailLogin');
  setupEnterKeySubmit('signupPassword', 'btnEmailSignup');
  setupEnterKeySubmit('resetEmail', 'btnSendReset');
}

/**
 * Allow Enter key to submit forms
 */
function setupEnterKeySubmit(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (input && button) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        button.click();
      }
    });
  }
}


// ===== PROFILE MANAGEMENT =====
async function saveProfile() {
  if (!currentUser || !isFirebaseConfigured()) {
    showToast('Please log in first.', 'warning');
    return;
  }

  const displayName = document.getElementById('profileDisplayName')?.value?.trim();
  const defaultExam = document.getElementById('profileDefaultExam')?.value;
  const category = document.getElementById('profileCategory')?.value;

  if (!displayName || displayName.length < 2) {
    showToast('Display name must be at least 2 characters.', 'error');
    return;
  }

  try {
    setAuthButtonLoading('btnSaveProfile', true);

    // Update Firebase Auth profile
    await currentUser.updateProfile({ displayName });

    // Update Firestore document
    if (db) {
      await db.collection('users').doc(currentUser.uid).set({
        displayName,
        defaultExam: defaultExam || '',
        category: category || 'general',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Update UI
    if (typeof updateUserInfo === 'function') {
      updateUserInfo({ ...currentUser, displayName });
    }

    showToast('Profile saved! ✅', 'success');
  } catch (error) {
    console.error('Profile save error:', error);
    showToast('Failed to save profile. Please try again.', 'error');
  } finally {
    setAuthButtonLoading('btnSaveProfile', false);
  }
}


// ===== UTILITY FUNCTIONS =====

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getFriendlyAuthError(error) {
  const errorMap = {
    'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/user-not-found': 'No account found with this email. Sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/popup-blocked': 'Popup was blocked by your browser. Please allow popups for this site.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    'auth/invalid-credential': 'Invalid email or password. Please check and try again.'
  };

  return errorMap[error.code] || error.message || 'An unexpected error occurred. Please try again.';
}


// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase
  const firebaseReady = initializeFirebase();

  // Initialize auth
  initAuth();

  // Wire up auth forms
  initAuthForms();

  console.log('🔐 Auth module initialized', firebaseReady ? '(Firebase connected)' : '(Demo mode)');
});
