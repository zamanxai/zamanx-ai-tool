import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// ------------------------------------------------------------------
// ZAMANX AI FIREBASE CONFIGURATION
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCDI3WzEnRK_suqQefgVCqJldgdW5WIfzA",
  authDomain: "zamanx-ai.firebaseapp.com",
  projectId: "zamanx-ai",
  storageBucket: "zamanx-ai.firebasestorage.app",
  messagingSenderId: "538000477392",
  appId: "1:538000477392:web:f9cd420b990075e7d5a2d5",
  measurementId: "G-XLL2K385F9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);

// Initialize Firestore with offline persistence enabled
// This mitigates "Backend didn't respond" errors by prioritizing local cache when offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Safe Analytics Initialization
let analytics = null;
try {
  // Only initialize analytics if in a browser environment
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.warn("Firebase Analytics could not be initialized:", error);
}

export { analytics };
export default app;