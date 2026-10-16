// Royalvazier Global Services Ltd - Firebase Cloud Integration
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, collection, doc, setDoc, getDocs, getDoc, writeBatch, deleteDoc } from "firebase/firestore";
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

// Web App Firebase Configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATTe1EAfn4aRss5sNVDsw59HVdb_tN4sQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kowa-gru-reg.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kowa-gru-reg",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kowa-gru-reg.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1023317910895",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1023317910895:web:55a39f501a00831bf6b49a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-L7XYLWSXE0"
};

// Initialize Firebase Core
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// Connect to the default Firestore database
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
      case 'auth/unauthorized-domain':
        return 'Unauthorized domain. Please visit using "localhost:3000" or add your current host/domain in Firebase Console > Authentication > Settings > Authorized domains.';
      case 'auth/requires-recent-login':
        return 'Please sign out and sign in again to complete this security action.';
      default:
        return error?.message || 'Authentication error. Please try again.';
    }
  }
};

/**
 * Helper to get the target user UID for per-account data isolation
 */
function getTargetUid(explicitUid?: string): string | null {
  return explicitUid || auth.currentUser?.uid || null;
}

/**
 * Cloud Firestore Sync Utilities for Vendora (Per-User Account Isolation)
 */
export const FirebaseSync = {
  /**
   * Real-time sync for a single product to the user's isolated 'products' collection
   */
  async syncProduct(product: any, userId?: string): Promise<boolean> {
    if (!product || !product.id) return false;
    const uid = getTargetUid(userId);
    if (!uid) {
      console.warn("Firestore syncProduct skipped: no authenticated user");
      return false;
    }
    try {
      const prodRef = doc(db, "users", uid, "products", String(product.id));
      await setDoc(prodRef, {
        ...product,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncProduct error:", err);
      return false;
    }
  },

  /**
   * Delete a single product from the user's isolated 'products' collection
   */
  async deleteProduct(productId: string, userId?: string): Promise<boolean> {
    if (!productId) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const prodRef = doc(db, "users", uid, "products", String(productId));
      await deleteDoc(prodRef);
      return true;
    } catch (err: any) {
      console.error("Firestore deleteProduct error:", err);
      return false;
    }
  },

  /**
   * Batch sync multiple products into user's isolated 'products' collection
   */
  async syncProductsBatch(products: any[], userId?: string): Promise<boolean> {
    if (!Array.isArray(products) || products.length === 0) return true;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const batch = writeBatch(db);
      for (const item of products) {
        if (!item || !item.id) continue;
        const ref = doc(db, "users", uid, "products", String(item.id));
        batch.set(ref, {
          ...item,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      await batch.commit();
      return true;
    } catch (err: any) {
      console.error("Firestore syncProductsBatch error:", err);
      return false;
    }
  },

  /**
   * Sync single sale in real time to the user's isolated 'sales' collection
   */
  async syncSale(sale: any, userId?: string): Promise<boolean> {
    if (!sale || !sale.id) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const saleRef = doc(db, "users", uid, "sales", String(sale.id));
      await setDoc(saleRef, {
        ...sale,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncSale error:", err);
      return false;
    }
  },

  /**
   * Sync single debt in real time to the user's isolated 'debts' collection
   */
  async syncDebt(debt: any, userId?: string): Promise<boolean> {
    if (!debt || !debt.id) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const debtRef = doc(db, "users", uid, "debts", String(debt.id));
      await setDoc(debtRef, {
        ...debt,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncDebt error:", err);
      return false;
    }
  },

  /**
   * Sync single purchase in real time to the user's isolated 'purchases' collection
   */
  async syncPurchase(purchase: any, userId?: string): Promise<boolean> {
    if (!purchase || !purchase.id) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const purRef = doc(db, "users", uid, "purchases", String(purchase.id));
      await setDoc(purRef, {
        ...purchase,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncPurchase error:", err);
      return false;
    }
  },

  /**
   * Sync settings to user's isolated 'settings' document
   */
  async syncSettings(settings: any, userId?: string): Promise<boolean> {
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const setRef = doc(db, "users", uid, "settings", "general");
      await setDoc(setRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncSettings error:", err);
      return false;
    }
  },

  /**
   * Sync reminder or activity message to user's isolated 'messages' collection
   */
  async syncMessage(messageData: any, userId?: string): Promise<boolean> {
    if (!messageData) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const msgId = messageData.id || `MSG-${Date.now()}`;
      const msgRef = doc(db, "users", uid, "messages", String(msgId));
      await setDoc(msgRef, {
        ...messageData,
        id: msgId,
        createdAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncMessage error:", err);
      return false;
    }
  },

  /**
   * Sync complete store snapshot to user's isolated Firestore cloud backup
   */
  async pushStoreSnapshot(storeData: {
    products?: any[];
    sales?: any[];
    debts?: any[];
    purchases?: any[];
    settings?: any;
  }, userId?: string): Promise<{ success: boolean; timestamp: string; error?: string }> {
    const uid = getTargetUid(userId);
    if (!uid) {
      return { success: false, timestamp: new Date().toISOString(), error: "User is not signed in." };
    }

    const executeSync = async () => {
      const now = new Date().toISOString();
      const snapshotRef = doc(db, "users", uid, "snapshots", "latest");
      
      // 1. Write the latest snapshot document inside the user's private space
      await setDoc(snapshotRef, {
        updatedAt: now,
        userId: uid,
        businessName: storeData.settings?.businessName || "Vendora Store",
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

      // 2. Also populate user's individual collections
      if (Array.isArray(storeData.products) && storeData.products.length > 0) {
        for (let i = 0; i < storeData.products.length; i += 400) {
          const chunk = storeData.products.slice(i, i + 400);
          await this.syncProductsBatch(chunk, uid);
        }
      }

      if (Array.isArray(storeData.sales)) {
        for (const sale of storeData.sales.slice(-50)) {
          await this.syncSale(sale, uid);
        }
      }

      if (Array.isArray(storeData.debts)) {
        for (const debt of storeData.debts) {
          await this.syncDebt(debt, uid);
        }
      }

      if (Array.isArray(storeData.purchases)) {
        for (const pur of storeData.purchases.slice(-50)) {
          await this.syncPurchase(pur, uid);
        }
      }

      if (storeData.settings) {
        await this.syncSettings(storeData.settings, uid);
      }

      return { success: true, timestamp: now };
    };

    try {
      const result = await Promise.race([
        executeSync(),
        new Promise<{ success: boolean; timestamp: string; error?: string }>((_, reject) =>
          setTimeout(() => reject(new Error("Sync timed out (25s). Cloud database is unreachable or slow network.")), 25000)
        )
      ]);
      return result;
    } catch (err: any) {
      console.error("Firebase sync error:", err);
      const isNotFound = err?.code === 'not-found' || String(err?.message || '').includes('NOT_FOUND');
      const isPermission = err?.code === 'permission-denied' || String(err?.message || '').includes('permission');
      let errorMsg = err?.message || "Sync failed.";
      if (isNotFound) {
        errorMsg = "Firestore Database not created yet. Please check Firebase Console > Firestore Database.";
      } else if (isPermission) {
        errorMsg = "Permission denied. Please publish your rules in Firebase Console > Firestore Database > Rules tab.";
      }
      return { success: false, timestamp: new Date().toISOString(), error: errorMsg };
    }
  },

  /**
   * Pull latest cloud backup from user's isolated Firestore collection
   */
  async pullStoreSnapshot(userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const uid = getTargetUid(userId);
    if (!uid) {
      console.warn("[FirebaseSync] pullStoreSnapshot: No UID provided or authenticated.");
      return { success: false, error: "No authenticated user session found." };
    }

    try {
      console.log(`[FirebaseSync] Pulling cloud data for user: ${uid}...`);
      const snapshotRef = doc(db, "users", uid, "snapshots", "latest");
      try {
        const docSnap = await getDoc(snapshotRef);
        if (docSnap.exists()) {
          const snapData = docSnap.data();
          if (snapData && snapData.payload) {
            console.log(`[FirebaseSync] Loaded snapshot for ${uid}:`, snapData.payload);
            return {
              success: true,
              data: snapData.payload
            };
          }
        }
      } catch (e) {
        console.warn("[FirebaseSync] Snapshot lookup notice:", e);
      }

      // Fallback: Pull directly from user's subcollections
      const productsSnap = await getDocs(collection(db, "users", uid, "products"));
      const products: any[] = [];
      productsSnap.forEach(d => {
        const item = d.data();
        products.push({ id: d.id, ...item });
      });

      const salesSnap = await getDocs(collection(db, "users", uid, "sales"));
      const sales: any[] = [];
      salesSnap.forEach(d => {
        const item = d.data();
        sales.push({ id: d.id, ...item });
      });

      const debtsSnap = await getDocs(collection(db, "users", uid, "debts"));
      const debts: any[] = [];
      debtsSnap.forEach(d => {
        const item = d.data();
        debts.push({ id: d.id, ...item });
      });

      const purchasesSnap = await getDocs(collection(db, "users", uid, "purchases"));
      const purchases: any[] = [];
      purchasesSnap.forEach(d => {
        const item = d.data();
        purchases.push({ id: d.id, ...item });
      });

      let settingsData = {};
      try {
        const setSnap = await getDoc(doc(db, "users", uid, "settings", "general"));
        if (setSnap.exists()) {
          settingsData = setSnap.data() || {};
        }
      } catch (e) {
        // settings optional
      }

      console.log(`[FirebaseSync] Found in subcollections for ${uid}: products=${products.length}, sales=${sales.length}, debts=${debts.length}`);

      if (products.length > 0 || sales.length > 0 || debts.length > 0 || purchases.length > 0) {
        return {
          success: true,
          data: {
            products,
            sales,
            debts,
            purchases,
            settings: settingsData
          }
        };
      }

      return { success: false, error: "No cloud data found for this user account." };
    } catch (err: any) {
      console.error("[FirebaseSync] pull error:", err);
      return { success: false, error: err.message };
    }
  }
};
