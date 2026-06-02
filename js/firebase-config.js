/**
 * TestEra — Firebase Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing)
 * 3. Go to Project Settings > General > Your Apps > Add Web App
 * 4. Copy the config object and replace the placeholders below
 * 5. Enable Authentication:
 *    - Go to Authentication > Sign-in method
 *    - Enable "Email/Password"
 *    - Enable "Google" (set support email)
 * 6. Create Firestore Database:
 *    - Go to Firestore Database > Create Database
 *    - Start in test mode (we'll add rules later)
 * 7. Enable Storage:
 *    - Go to Storage > Get Started
 */

// ===== FIREBASE CONFIG =====
// Replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyCkspFjmnRE9ImOsX4gFDiCLjBNQjlICRs",
  authDomain: "testeara.firebaseapp.com",
  projectId: "testeara",
  storageBucket: "testeara.firebasestorage.app",
  messagingSenderId: "325767880250",
  appId: "1:325767880250:web:3e08e61d2aac24e47a1f03",
  measurementId: "G-NQQRQF6PJ2"
};

// ===== INITIALIZE FIREBASE =====
let app, auth, db, storage;

function initializeFirebase() {
  try {
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK not loaded. Make sure Firebase scripts are included in HTML.');
      return false;
    }

    // Check if config is still placeholder
    if (firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
      console.warn('⚠️ Firebase config has placeholder values. Replace with your actual Firebase config in js/firebase-config.js');
      showFirebaseSetupWarning();
      return false;
    }

    // Initialize Firebase
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();

    // Enable Firestore offline persistence
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser');
      }
    });

    console.log('🔥 Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return false;
  }
}

// Show a friendly warning when Firebase is not configured
function showFirebaseSetupWarning() {
  const banner = document.createElement('div');
  banner.id = 'firebaseSetupBanner';
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #f59e0b, #f97316);
    color: #000;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    z-index: 9999;
    box-shadow: 0 8px 32px rgba(245, 158, 11, 0.3);
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 90vw;
    text-align: center;
    animation: fadeInUp 0.5s ease;
  `;
  banner.innerHTML = `
    <span>⚠️</span>
    <span>Firebase not configured. Open <code style="background:rgba(0,0,0,0.15);padding:2px 6px;border-radius:4px;">js/firebase-config.js</code> and add your Firebase keys.</span>
    <button onclick="this.parentElement.remove()" style="background:rgba(0,0,0,0.2);border:none;color:#000;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
  `;
  document.body.appendChild(banner);
}

// Check if Firebase is configured (not placeholder)
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE';
}
