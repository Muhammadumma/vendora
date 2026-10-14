// Royalvazier Global Services Ltd - Firebase Cloud Integration
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, collection, doc, setDoc, getDocs, getDoc, writeBatch } from "firebase/firestore";
import { 
  getAuth, 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
  UserCredential
} from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// Royalvazier Web App Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyACNwBxxq4UDK4UF5DTDZL8j6U01jmeveY",
  authDomain: "royalvazier.firebaseapp.com",
  projectId: "royalvazier",
  storageBucket: "royalvazier.firebasestorage.app",
  messagingSenderId: "983030168656",
  appId: "1:983030168656:web:ce1802f628261ecb692555",
  measurementId: "G-XYZYR0BNQF"
};

// Initialize Firebase Core
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Google Auth Provider setup
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

// Safe Analytics Initialization for Web/Browser
export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.debug("Firebase Analytics not supported in this environment:", err);
  });
}

/**
 * Normalizes email input: accepts direct email or converts username to default royalvazier domain email
 */
function normalizeEmail(emailOrUsername: string): string {
  const trimmed = emailOrUsername.trim();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  // Convert username to a valid email representation
  const sanitized = trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${sanitized || 'admin'}@royalvazier.com.ng`;
}

/**
 * Firebase Authentication Service for Royalvazier Vendora
 */
export const FirebaseAuthService = {
  /**
   * Listen for Firebase Auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Current active Firebase User
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  /**
   * Sign in with Email and Password
   */
  async loginWithEmail(emailOrUsername: string, password: string): Promise<FirebaseUser> {
    const email = normalizeEmail(emailOrUsername);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  },

  /**
   * Register new user with Email and Password
   */
  async registerWithEmail(
    emailOrUsername: string,
    password: string,
    displayName?: string,
    photoURL?: string | null
  ): Promise<FirebaseUser> {
    const email = normalizeEmail(emailOrUsername);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName || photoURL) {
      try {
        await updateProfile(credential.user, {
          displayName: displayName || email.split('@')[0],
          photoURL: photoURL || undefined
        });
      } catch (e) {
        console.warn("Could not update user profile details:", e);
      }
    }
    return credential.user;
  },

  /**
   * Sign in with Google Popup
   */
  async loginWithGoogle(): Promise<FirebaseUser> {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    return credential.user;
  },

  /**
   * Send Password Reset Email
   */
  async resetPassword(emailOrUsername: string): Promise<void> {
    const email = normalizeEmail(emailOrUsername);
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Sign out of Firebase
   */
  async logout(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn("Firebase sign out error:", err);
    }
  },

  /**
   * Converts Firebase Auth error codes into friendly user messages
   */
  getErrorMessage(error: any): string {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact your administrator.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again or create an account.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-In was closed before completing.';
      case 'auth/popup-blocked':
        return 'Google popup was blocked by your browser. Please allow popups for this site.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection.';
      case 'auth/operation-not-allowed':
        return 'This authentication method is currently disabled in your Firebase console. Please enable Email/Password or Google provider in Firebase Authentication.';
      case 'auth/requires-recent-login':
        return 'Please sign out and sign in again to complete this security action.';
      default:
        return error?.message || 'Authentication error. Please try again.';
    }
  }
};

/**
 * Cloud Firestore Sync Utilities for Royalvazier
 */
export const FirebaseSync = {
  /**
   * Sync complete store snapshot to Firestore cloud backup
   */
  async pushStoreSnapshot(storeData: {
    products?: any[];
    sales?: any[];
    debts?: any[];
    purchases?: any[];
    settings?: any;
  }): Promise<{ success: boolean; timestamp: string; error?: string }> {
    try {
      const now = new Date().toISOString();
      const snapshotRef = doc(db, "snapshots", "latest");
      
      await setDoc(snapshotRef, {
        updatedAt: now,
        businessName: storeData.settings?.businessName || "Royalvazier Textile",
        productsCount: storeData.products?.length || 0,
        salesCount: storeData.sales?.length || 0,
        debtsCount: storeData.debts?.length || 0,
        purchasesCount: storeData.purchases?.length || 0,
        payload: {
          products: storeData.products || [],
          sales: storeData.sales || [],
          debts: storeData.debts || [],
          purchases: storeData.purchases || [],
          settings: storeData.settings || {}
        }
      }, { merge: true });

      // Save timestamped backup document in history
      const historyRef = doc(collection(db, "backup_history"));
      await setDoc(historyRef, {
        timestamp: now,
        productsCount: storeData.products?.length || 0,
        salesCount: storeData.sales?.length || 0,
        debtsCount: storeData.debts?.length || 0
      });

      return { success: true, timestamp: now };
    } catch (err: any) {
      console.error("Firebase sync error:", err);
      return { success: false, timestamp: new Date().toISOString(), error: err.message };
    }
  },

  /**
   * Pull latest cloud backup from Firestore
   */
  async pullStoreSnapshot(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const snapshotRef = doc(db, "snapshots", "latest");
      const docSnap = await getDoc(snapshotRef);

      if (!docSnap.exists()) {
        return { success: false, error: "No cloud snapshot found in Firestore." };
      }

      const snapData = docSnap.data();
      return {
        success: true,
        data: snapData.payload || null
      };
    } catch (err: any) {
      console.error("Firebase pull error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Sync single sale in real time
   */
  async syncSale(sale: any): Promise<void> {
    try {
      const saleRef = doc(db, "sales", sale.id);
      await setDoc(saleRef, { ...sale, syncedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn("Realtime sale sync warning:", err);
    }
  },

  /**
   * Sync single debt in real time
   */
  async syncDebt(debt: any): Promise<void> {
    try {
      const debtRef = doc(db, "debts", debt.id);
      await setDoc(debtRef, { ...debt, syncedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn("Realtime debt sync warning:", err);
    }
  }
};
