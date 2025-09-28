// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Email/Password Authentication
  function signup(email, password, additionalData) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUserProfile(null);
    return signOut(auth);
  }

  // Phone Authentication
  function setupRecaptcha(elementId) {
    const recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      'size': 'invisible',
      'callback': (response) => {
        console.log('Recaptcha verified');
      }
    });
    return recaptchaVerifier;
  }

  function sendOTP(phoneNumber, recaptchaVerifier) {
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  }

  // User Profile Management
  async function createUserProfile(userId, data) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return false;
    }
  }

  async function getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  async function updateUserProfile(userId, data) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...data,
        updatedAt: new Date()
      }, { merge: true });
      
      // Update local state
      setUserProfile(prev => ({...prev, ...data}));
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile when user logs in
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    setupRecaptcha,
    sendOTP,
    createUserProfile,
    getUserProfile,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}