// Authentication Controller with Firebase Auth & Demo Fallback Support
import { 
  auth, 
  db,
  googleProvider, 
  isConfigured, 
  signInWithPopup,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from './firebase-config.js';

// Creates the user's profile doc in Firestore on first sign-in/registration.
// Safe to call every login — it only writes fields that are missing.
async function ensureUserProfile(user, extra = {}) {
  if (!isConfigured || !db) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: user.displayName || extra.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        ...extra
      });
    }
  } catch (err) {
    console.error('[Firestore] Failed to create user profile:', err);
  }
}

class AuthController {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.redirectListeners = [];
    this.init();
  }

  // Fires when a Google popup sign-in completes successfully.
  onGoogleRedirectSuccess(callback) {
    this.redirectListeners.push(callback);
  }

  init() {
    if (isConfigured && auth) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
          };
        } else {
          this.currentUser = null;
        }
        this.notifyListeners();
      });
    } else {
      // Check for saved demo session in localStorage
      const savedSession = localStorage.getItem('glass_demo_auth_user');
      if (savedSession) {
        try {
          this.currentUser = JSON.parse(savedSession);
        } catch (e) {
          this.currentUser = null;
        }
      }
      this.notifyListeners();
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  // Google Sign-In via popup. Opens a Google account chooser in a popup
  // window and resolves immediately with the signed-in user — no page
  // navigation, no dependence on redirect-result storage.
  async signInWithGoogle() {
    if (isConfigured && auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(result.user);
        this.redirectListeners.forEach(cb => cb(result.user));
        return { success: true, user: result.user };
      } catch (error) {
        console.error("Google Auth Error:", error);
        return { success: false, error: error.message };
      }
    } else {
      // Interactive Demo Google Auth simulation
      const demoUser = {
        uid: 'demo-google-' + Date.now(),
        displayName: 'Alex Chen',
        email: 'alex.chen@glassstore.com',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        isDemo: true
      };
      this.currentUser = demoUser;
      localStorage.setItem('glass_demo_auth_user', JSON.stringify(demoUser));
      this.notifyListeners();
      return { success: true, user: demoUser, isDemo: true };
    }
  }

  // Email / Password Login
  async signInWithEmail(email, password) {
    if (isConfigured && auth) {
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Interactive Demo Email Auth simulation
      const demoUser = {
        uid: 'demo-email-' + Date.now(),
        displayName: email.split('@')[0],
        email: email,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        isDemo: true
      };
      this.currentUser = demoUser;
      localStorage.setItem('glass_demo_auth_user', JSON.stringify(demoUser));
      this.notifyListeners();
      return { success: true, user: demoUser, isDemo: true };
    }
  }

  // Email / Password Registration
  async registerWithEmail(email, password, displayName) {
    if (isConfigured && auth) {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(result.user, { displayName });
        }
        await ensureUserProfile(result.user, { displayName });
        return { success: true, user: result.user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      const demoUser = {
        uid: 'demo-reg-' + Date.now(),
        displayName: displayName || email.split('@')[0],
        email: email,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName || email}`,
        isDemo: true
      };
      this.currentUser = demoUser;
      localStorage.setItem('glass_demo_auth_user', JSON.stringify(demoUser));
      this.notifyListeners();
      return { success: true, user: demoUser, isDemo: true };
    }
  }

  // Sign Out
  async logout() {
    if (isConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Signout Error:", err);
      }
    } else {
      localStorage.removeItem('glass_demo_auth_user');
      this.currentUser = null;
      this.notifyListeners();
    }
  }
}

export const authController = new AuthController();
