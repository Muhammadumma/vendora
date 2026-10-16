// Royalvazier Global Services Ltd - Firebase Cloud Integration
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, collection, doc, setDoc, getDocs, getDoc, writeBatch, deleteDoc, onSnapshot } from "firebase/firestore";
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
  if (explicitUid && typeof explicitUid === 'string' && explicitUid.trim().length > 0) {
    return explicitUid.trim();
  }
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem('vendora_active_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.uid) return parsed.uid;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

/**
 * Recursively cleans and removes any 'undefined' values from an object,
 * ensuring it is 100% compliant with Firestore data serialization rules.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
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
      const sanitized = sanitizeForFirestore(product);
      const prodRef = doc(db, "users", uid, "products", String(product.id));
      await setDoc(prodRef, {
        ...sanitized,
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
      for (let i = 0; i < products.length; i += 400) {
        const chunk = products.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const item of chunk) {
          if (!item || !item.id) continue;
          const sanitized = sanitizeForFirestore(item);
          const ref = doc(db, "users", uid, "products", String(item.id));
          batch.set(ref, {
            ...sanitized,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        await batch.commit();
      }
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
      const sanitized = sanitizeForFirestore(sale);
      const saleRef = doc(db, "users", uid, "sales", String(sale.id));
      await setDoc(saleRef, {
        ...sanitized,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncSale error:", err);
      return false;
    }
  },

  /**
   * Batch sync multiple sales into user's isolated 'sales' collection
   */
  async syncSalesBatch(sales: any[], userId?: string): Promise<boolean> {
    if (!Array.isArray(sales) || sales.length === 0) return true;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      for (let i = 0; i < sales.length; i += 400) {
        const chunk = sales.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const item of chunk) {
          if (!item || !item.id) continue;
          const sanitized = sanitizeForFirestore(item);
          const ref = doc(db, "users", uid, "sales", String(item.id));
          batch.set(ref, {
            ...sanitized,
            syncedAt: new Date().toISOString()
          }, { merge: true });
        }
        await batch.commit();
      }
      return true;
    } catch (err: any) {
      console.error("Firestore syncSalesBatch error:", err);
      return false;
    }
  },

  /**
   * Delete a single sale from user's isolated 'sales' collection
   */
  async deleteSale(saleId: string, userId?: string): Promise<boolean> {
    if (!saleId) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const saleRef = doc(db, "users", uid, "sales", String(saleId));
      await deleteDoc(saleRef);
      return true;
    } catch (err: any) {
      console.error("Firestore deleteSale error:", err);
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
      const sanitized = sanitizeForFirestore(debt);
      const debtRef = doc(db, "users", uid, "debts", String(debt.id));
      await setDoc(debtRef, {
        ...sanitized,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncDebt error:", err);
      return false;
    }
  },

  /**
   * Batch sync multiple debts into user's isolated 'debts' collection
   */
  async syncDebtsBatch(debts: any[], userId?: string): Promise<boolean> {
    if (!Array.isArray(debts) || debts.length === 0) return true;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      for (let i = 0; i < debts.length; i += 400) {
        const chunk = debts.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const item of chunk) {
          if (!item || !item.id) continue;
          const sanitized = sanitizeForFirestore(item);
          const ref = doc(db, "users", uid, "debts", String(item.id));
          batch.set(ref, {
            ...sanitized,
            syncedAt: new Date().toISOString()
          }, { merge: true });
        }
        await batch.commit();
      }
      return true;
    } catch (err: any) {
      console.error("Firestore syncDebtsBatch error:", err);
      return false;
    }
  },

  /**
   * Delete a single debt from user's isolated 'debts' collection
   */
  async deleteDebt(debtId: string, userId?: string): Promise<boolean> {
    if (!debtId) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const debtRef = doc(db, "users", uid, "debts", String(debtId));
      await deleteDoc(debtRef);
      return true;
    } catch (err: any) {
      console.error("Firestore deleteDebt error:", err);
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
      const sanitized = sanitizeForFirestore(purchase);
      const purRef = doc(db, "users", uid, "purchases", String(purchase.id));
      await setDoc(purRef, {
        ...sanitized,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err: any) {
      console.error("Firestore syncPurchase error:", err);
      return false;
    }
  },

  /**
   * Batch sync multiple purchases into user's isolated 'purchases' collection
   */
  async syncPurchasesBatch(purchases: any[], userId?: string): Promise<boolean> {
    if (!Array.isArray(purchases) || purchases.length === 0) return true;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      for (let i = 0; i < purchases.length; i += 400) {
        const chunk = purchases.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const item of chunk) {
          if (!item || !item.id) continue;
          const sanitized = sanitizeForFirestore(item);
          const ref = doc(db, "users", uid, "purchases", String(item.id));
          batch.set(ref, {
            ...sanitized,
            syncedAt: new Date().toISOString()
          }, { merge: true });
        }
        await batch.commit();
      }
      return true;
    } catch (err: any) {
      console.error("Firestore syncPurchasesBatch error:", err);
      return false;
    }
  },

  /**
   * Delete a single purchase from user's isolated 'purchases' collection
   */
  async deletePurchase(purchaseId: string, userId?: string): Promise<boolean> {
    if (!purchaseId) return false;
    const uid = getTargetUid(userId);
    if (!uid) return false;
    try {
      const purRef = doc(db, "users", uid, "purchases", String(purchaseId));
      await deleteDoc(purRef);
      return true;
    } catch (err: any) {
      console.error("Firestore deletePurchase error:", err);
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
      const sanitized = sanitizeForFirestore(settings);
      const setRef = doc(db, "users", uid, "settings", "general");
      await setDoc(setRef, {
        ...sanitized,
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
      const sanitized = sanitizeForFirestore(messageData);
      const msgId = messageData.id || `MSG-${Date.now()}`;
      const msgRef = doc(db, "users", uid, "messages", String(msgId));
      await setDoc(msgRef, {
        ...sanitized,
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
   * Transfers 100% of all data records using atomic batches.
   */
  async pushStoreSnapshot(storeData: {
    products?: any[];
    sales?: any[];
    debts?: any[];
    purchases?: any[];
    settings?: any;
    messages?: any[];
  }, userId?: string): Promise<{ success: boolean; timestamp: string; error?: string }> {
    const uid = getTargetUid(userId);
    if (!uid) {
      return { success: false, timestamp: new Date().toISOString(), error: "User is not signed in." };
    }

    const executeSync = async () => {
      const now = new Date().toISOString();
      const snapshotRef = doc(db, "users", uid, "snapshots", "latest");
      
      // 1. Sanitize payload to strip any undefined values and write latest snapshot
      const sanitizedPayload = sanitizeForFirestore({
        products: storeData.products || [],
        sales: storeData.sales || [],
        debts: storeData.debts || [],
        purchases: storeData.purchases || [],
        settings: storeData.settings || {}
      });

      await setDoc(snapshotRef, {
        updatedAt: now,
        userId: uid,
        businessName: storeData.settings?.businessName || "Vendora Store",
        productsCount: storeData.products?.length || 0,
        salesCount: storeData.sales?.length || 0,
        debtsCount: storeData.debts?.length || 0,
        purchasesCount: storeData.purchases?.length || 0,
        payload: sanitizedPayload
      }, { merge: true });

      // 2. Transfer 100% of products in atomic batches
      if (Array.isArray(storeData.products) && storeData.products.length > 0) {
        await this.syncProductsBatch(storeData.products, uid);
      }

      // 3. Transfer 100% of sales in atomic batches
      if (Array.isArray(storeData.sales) && storeData.sales.length > 0) {
        await this.syncSalesBatch(storeData.sales, uid);
      }

      // 4. Transfer 100% of debts in atomic batches
      if (Array.isArray(storeData.debts) && storeData.debts.length > 0) {
        await this.syncDebtsBatch(storeData.debts, uid);
      }

      // 5. Transfer 100% of purchases in atomic batches
      if (Array.isArray(storeData.purchases) && storeData.purchases.length > 0) {
        await this.syncPurchasesBatch(storeData.purchases, uid);
      }

      // 6. Transfer shop settings
      if (storeData.settings) {
        await this.syncSettings(storeData.settings, uid);
      }

      return { success: true, timestamp: now };
    };

    try {
      const result = await Promise.race([
        executeSync(),
        new Promise<{ success: boolean; timestamp: string; error?: string }>((_, reject) =>
          setTimeout(() => reject(new Error("Sync timed out (30s). Cloud database is unreachable or slow network.")), 30000)
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
   * 100% Complete Data Transfer to Cloud Firestore Database
   * Transfers all collections with detailed execution statistics.
   */
  async transferAllDataToCloud(storeData: {
    products?: any[];
    sales?: any[];
    debts?: any[];
    purchases?: any[];
    settings?: any;
    messages?: any[];
  }, userId?: string): Promise<{
    success: boolean;
    timestamp: string;
    stats: {
      products: number;
      sales: number;
      debts: number;
      purchases: number;
      settings: boolean;
      snapshot: boolean;
    };
    error?: string;
  }> {
    const uid = getTargetUid(userId);
    const now = new Date().toISOString();
    const stats = {
      products: storeData.products?.length || 0,
      sales: storeData.sales?.length || 0,
      debts: storeData.debts?.length || 0,
      purchases: storeData.purchases?.length || 0,
      settings: Boolean(storeData.settings),
      snapshot: true
    };

    if (!uid) {
      return {
        success: false,
        timestamp: now,
        stats,
        error: "User is not signed in. Cannot transfer without an account."
      };
    }

    const pushResult = await this.pushStoreSnapshot(storeData, uid);
    return {
      success: pushResult.success,
      timestamp: pushResult.timestamp || now,
      stats,
      error: pushResult.error
    };
  },

  /**
   * Pull latest cloud data directly from user's isolated Firestore collections
   */
  async pullStoreSnapshot(userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const uid = getTargetUid(userId);
    if (!uid) {
      console.warn("[FirebaseSync] pullStoreSnapshot: No UID provided or authenticated.");
      return { success: false, error: "No authenticated user session found." };
    }

    try {
      console.log(`[FirebaseSync] Pulling live data directly from Firestore for user: ${uid}...`);

      // 1. Pull directly from user's live collections (NEVER rely on stale snapshots!)
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

      console.log(`[FirebaseSync] Retrieved from Firestore for ${uid}: products=${products.length}, sales=${sales.length}, debts=${debts.length}`);

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

      // Check snapshot as last-resort backup if subcollections were empty
      const snapshotRef = doc(db, "users", uid, "snapshots", "latest");
      try {
        const docSnap = await getDoc(snapshotRef);
        if (docSnap.exists()) {
          const snapData = docSnap.data();
          if (snapData && snapData.payload && Array.isArray(snapData.payload.products) && snapData.payload.products.length > 0) {
            return {
              success: true,
              data: snapData.payload
            };
          }
        }
      } catch (e) {
        // ignore
      }

      return { success: false, error: "No cloud data found for this user account." };
    } catch (err: any) {
      console.error("[FirebaseSync] pull error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Real-time multi-collection listener for a user account
   */
  subscribeToUserData(userId: string, callbacks: {
    onProducts?: (products: any[]) => void;
    onSales?: (sales: any[]) => void;
    onDebts?: (debts: any[]) => void;
    onPurchases?: (purchases: any[]) => void;
    onSettings?: (settings: any) => void;
  }): (() => void)[] {
    const uid = getTargetUid(userId);
    if (!uid) return [];

    console.log(`[FirebaseSync] Subscribing to real-time updates for user: ${uid}`);
    const unsubs: (() => void)[] = [];

    // 1. Live Products listener
    if (callbacks.onProducts) {
      const unsub = onSnapshot(collection(db, "users", uid, "products"), (snap) => {
        const products: any[] = [];
        snap.forEach(d => {
          products.push({ id: d.id, ...d.data() });
        });
        console.log(`[FirebaseSync] Real-time products sync received: ${products.length} items`);
        callbacks.onProducts!(products);
      }, (err) => {
        console.warn("[FirebaseSync] Live products listener error:", err);
      });
      unsubs.push(unsub);
    }

    // 2. Live Sales listener
    if (callbacks.onSales) {
      const unsub = onSnapshot(collection(db, "users", uid, "sales"), (snap) => {
        const sales: any[] = [];
        snap.forEach(d => {
          sales.push({ id: d.id, ...d.data() });
        });
        callbacks.onSales!(sales);
      }, (err) => {
        console.warn("[FirebaseSync] Live sales listener error:", err);
      });
      unsubs.push(unsub);
    }

    // 3. Live Debts listener
    if (callbacks.onDebts) {
      const unsub = onSnapshot(collection(db, "users", uid, "debts"), (snap) => {
        const debts: any[] = [];
        snap.forEach(d => {
          debts.push({ id: d.id, ...d.data() });
        });
        callbacks.onDebts!(debts);
      }, (err) => {
        console.warn("[FirebaseSync] Live debts listener error:", err);
      });
      unsubs.push(unsub);
    }

    // 4. Live Purchases listener
    if (callbacks.onPurchases) {
      const unsub = onSnapshot(collection(db, "users", uid, "purchases"), (snap) => {
        const purchases: any[] = [];
        snap.forEach(d => {
          purchases.push({ id: d.id, ...d.data() });
        });
        callbacks.onPurchases!(purchases);
      }, (err) => {
        console.warn("[FirebaseSync] Live purchases listener error:", err);
      });
      unsubs.push(unsub);
    }

    // 5. Live Settings listener
    if (callbacks.onSettings) {
      const unsub = onSnapshot(doc(db, "users", uid, "settings", "general"), (docSnap) => {
        if (docSnap.exists()) {
          callbacks.onSettings!(docSnap.data());
        }
      }, (err) => {
        console.warn("[FirebaseSync] Live settings listener error:", err);
      });
      unsubs.push(unsub);
    }

    return unsubs;
  }
};
