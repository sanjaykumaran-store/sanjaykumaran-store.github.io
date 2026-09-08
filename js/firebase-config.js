// Firebase Configuration and Initialization Module
// Using Firebase v10 Modular SDK via official CDN

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

/**
 * -------------------------------------------------------------
 * FIREBASE CONFIGURATION INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a project and register a Web App.
 * 3. In the Firebase Console, go to Authentication > Sign-in method,
 *    and enable 'Google' and 'Email/Password' providers.
 * 4. Go to Firestore Database > Create database (start in production mode),
 *    and set the security rules shown in README.md so each user can only
 *    read/write their own document.
 * 5. Ensure 'localhost' (and your real domain, once deployed) is listed
 *    under Authorized Domains in Authentication settings.
 * 6. Replace the placeholder values below with your project credentials.
 * -------------------------------------------------------------
 */
export const firebaseConfig = {
  apiKey: "AIzaSyA3IC4H7aBLzW1id1bsxISQMYZFvIR20Bo",
  authDomain: "sk-store-76907.firebaseapp.com",
  databaseURL: "https://sk-store-76907-default-rtdb.firebaseio.com",
  projectId: "sk-store-76907",
  storageBucket: "sk-store-76907.firebasestorage.app",
  messagingSenderId: "817773933826",
  appId: "1:817773933826:web:60c3dd8dddbc6e8e8e7e1b",
  measurementId: "G-5QEGZ0ZNHB"
};

// Auto-detect if real credentials were provided or if placeholder mode is active
export const isConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
  !firebaseConfig.apiKey.includes("YOUR_")
);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    console.log("%c[Firebase]%c Connected to live Firebase Auth + Firestore service.", "color:#06b6d4;font-weight:bold", "color:inherit");
  } catch (err) {
    console.warn("[Firebase] Live initialization failed, falling back to Demo Mode:", err.message);
  }
} else {
  console.log("%c[Firebase]%c Running in Interactive Demo Mode. Add your API credentials to js/firebase-config.js to connect to Google Firebase.", "color:#f59e0b;font-weight:bold", "color:inherit");
}

export { 
  app, 
  auth, 
  db,
  googleProvider, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
};
