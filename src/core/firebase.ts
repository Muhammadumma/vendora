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
// Connect to the 'default' database created in Firebase Console
export const db: Firestore = getFirestore(app, "default");
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
 * Cloud Firestore Sync Utilities for Royalvazier Vendora
 */
export const FirebaseSync = {
  /**
   * Real-time sync for a single product to the 'products' collection
   */
  async syncProduct(product: any): Promise<boolean> {
    if (!product || !product.id) return false;
    try {
      const prodRef = doc(db, "products", String(product.id));
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
   * Delete a single product from the 'products' collection
   */
  async deleteProduct(productId: string): Promise<boolean> {
    if (!productId) return false;
    try {
      const prodRef = doc(db, "products", String(productId));
      await deleteDoc(prodRef);
      return true;
    } catch (err: any) {
      console.error("Firestore deleteProduct error:", err);
      return false;
    }
  },

  /**
   * Batch sync multiple products
   */
  async syncProductsBatch(products: any[]): Promise<boolean> {
    if (!Array.isArray(products) || products.length === 0) return true;
    try {
      const batch = writeBatch(db);
      for (const item of products) {
        if (!item || !item.id) continue;
        const ref = doc(db, "products", String(item.id));
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
   * Sync single sale in real time to the 'sales' collection
   */
  async syncSale(sale: any): Promise<boolean> {
    if (!sale || !sale.id) return false;
    try {
      const saleRef = doc(db, "sales", String(sale.id));
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
   * Sync single debt in real time to the 'debts' collection
   */
  async syncDebt(debt: any): Promise<boolean> {
    if (!debt || !debt.id) return false;
    try {
      const debtRef = doc(db, "debts", String(debt.id));
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
   * Sync single purchase in real time to the 'purchases' collection
   */
  async syncPurchase(purchase: any): Promise<boolean> {
    if (!purchase || !purchase.id) return false;
    try {
      const purRef = doc(db, "purchases", String(purchase.id));
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
   * Sync settings to 'settings' collection
   */
  async syncSettings(settings: any): Promise<boolean> {
    try {
      const setRef = doc(db, "settings", "general");
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
   * Sync reminder or activity message to 'messages' collection in Firestore
   */
  async syncMessage(messageData: any): Promise<boolean> {
    if (!messageData) return false;
    try {
      const msgId = messageData.id || `MSG-${Date.now()}`;
      const msgRef = doc(db, "messages", String(msgId));
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
   * Sync complete store snapshot to Firestore cloud backup and individual collections
   */
  async pushStoreSnapshot(storeData: {
    products?: any[];
    sales?: any[];
    debts?: any[];
    purchases?: any[];
    settings?: any;
  }): Promise<{ success: boolean; timestamp: string; error?: string }> {
    const executeSync = async () => {
      const now = new Date().toISOString();
      const snapshotRef = doc(db, "snapshots", "latest");
      
      // 1. Write the latest snapshot document
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

      // 2. Also populate individual collections so items are directly browsable in Firestore console
      if (Array.isArray(storeData.products) && storeData.products.length > 0) {
        for (let i = 0; i < storeData.products.length; i += 400) {
          const chunk = storeData.products.slice(i, i + 400);
          await this.syncProductsBatch(chunk);
        }
      }

      if (Array.isArray(storeData.sales)) {
        for (const sale of storeData.sales.slice(-20)) {
          await this.syncSale(sale);
        }
      }

      if (Array.isArray(storeData.debts)) {
        for (const debt of storeData.debts) {
          await this.syncDebt(debt);
        }
      }

      if (storeData.settings) {
        await this.syncSettings(storeData.settings);
      }

      return { success: true, timestamp: now };
    };

    try {
      // 25 second timeout for realistic mobile/cellular connections
      const result = await Promise.race([
        executeSync(),
        new Promise<{ success: boolean; timestamp: string; error?: string }>((_, reject) =>
          setTimeout(() => reject(new Error("Sync timed out (25s). Cloud database is unreachable or slow network.")), 25000)
        )
      ]);
      return result;
    } catch (err: any) {
      console.error("Firebase sync error:", err);
      const isNotFound = err?.code === 'not-found' || String(err?.message || '').includes('NOT_FOUND') || String(err || '').includes('NOT_FOUND');
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
   * Pull latest cloud backup from Firestore
   */
  async pullStoreSnapshot(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const snapshotRef = doc(db, "snapshots", "latest");
      const docSnap = await getDoc(snapshotRef);

      if (docSnap.exists()) {
        const snapData = docSnap.data();
        if (snapData && snapData.payload) {
          return {
            success: true,
            data: snapData.payload
          };
        }
      }

      // Fallback: Pull from collections directly
      const productsSnap = await getDocs(collection(db, "products"));
      const products: any[] = [];
      productsSnap.forEach(d => products.push(d.data()));

      const salesSnap = await getDocs(collection(db, "sales"));
      const sales: any[] = [];
      salesSnap.forEach(d => sales.push(d.data()));

      const debtsSnap = await getDocs(collection(db, "debts"));
      const debts: any[] = [];
      debtsSnap.forEach(d => debts.push(d.data()));

      if (products.length > 0 || sales.length > 0 || debts.length > 0) {
        return {
          success: true,
          data: {
            products,
            sales,
            debts,
            purchases: [],
            settings: {}
          }
        };
      }

      return { success: false, error: "No cloud snapshot or collection data found in Firestore." };
    } catch (err: any) {
      console.error("Firebase pull error:", err);
      return { success: false, error: err.message };
    }
  }
};
