// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBlbgPlYZnHUZ8gGmDm7pFQlpGubGbUYZY",
  authDomain: "hyperlocal-1e0d5.firebaseapp.com",
  projectId: "hyperlocal-1e0d5",
  storageBucket: "hyperlocal-1e0d5.firebasestorage.app",
  messagingSenderId: "554130415887",
  appId: "1:554130415887:web:0dfe67e0ae65425e409e7a",
  measurementId: "G-HZZV1GZE4Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const analytics = getAnalytics(app);

export default app;