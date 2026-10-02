import { db, auth } from './firebase-init.js';
import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    deleteDoc,
    serverTimestamp,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const FirestoreService = {
    // Get user-specific collection path
    getUserColl(collName) {
        const user = auth.currentUser;
        if (!user) throw new Error("Auth required for Firestore sync.");
        return collection(db, `users/${user.uid}/${collName}`);
    },

    // Save or Update a document
    async save(collName, id, data) {
        try {
            const userColl = this.getUserColl(collName);
            const docRef = doc(userColl, id);
            await setDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error(`Error saving to ${collName}:`, error);
        }
    },

    // Real-time listener for a collection
    subscribe(collName, callback) {
        try {
            const userColl = this.getUserColl(collName);
            const q = query(userColl, orderBy('updatedAt', 'desc'));

            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(data);
            }, (error) => {
                console.error(`Error subscribing to ${collName}:`, error);
            });
        } catch (error) {
            console.error(`Subscription failed for ${collName}:`, error);
        }
    },

    // Delete a document
    async delete(collName, id) {
        try {
            const userColl = this.getUserColl(collName);
            await deleteDoc(doc(userColl, id));
        } catch (error) {
            console.error(`Error deleting from ${collName}:`, error);
        }
    },

    // Initial data fetch
    async getAll(collName) {
        try {
            const userColl = this.getUserColl(collName);
            const snapshot = await getDocs(userColl);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error fetching ${collName}:`, error);
            return [];
        }
    }
};

export default FirestoreService;
