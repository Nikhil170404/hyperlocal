// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAeDZ1rZVBdt-LqBGifma6WqqbjvQWmuXg",
  authDomain: "hyperlocal-8264a.firebaseapp.com",
  databaseURL: "https://hyperlocal-8264a-default-rtdb.firebaseio.com",
  projectId: "hyperlocal-8264a",
  storageBucket: "hyperlocal-8264a.firebasestorage.app",
  messagingSenderId: "1033236341681",
  appId: "1:1033236341681:web:0a61e803033b1920475390",
  measurementId: "G-XGFQFV41MG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const analytics = getAnalytics(app);

export default app;