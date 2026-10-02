import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBYAWjUzOQ3prcdtUU_JxlQF-ojuXFe6XM",
    authDomain: "busness-tracking-system.firebaseapp.com",
    projectId: "busness-tracking-system",
    storageBucket: "busness-tracking-system.firebasestorage.app",
    messagingSenderId: "884140671426",
    appId: "1:884140671426:web:1ae2fc1d535474960d165b",
    measurementId: "G-Y1S09576SE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
});

console.log('Firebase initialized:', app.name);

export { app, analytics, auth, db };
