// Firebase initialization and small auth helpers
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  onAuthStateChanged as fbOnAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
} from "firebase/auth";

// Firebase config (from user) - keep this file under source control, but consider moving secrets to env for production
const firebaseConfig = {
  apiKey: "AIzaSyA1i6iZ_vIu0ECcRS4mvL53zGCF2FmzGPo",
  authDomain: "realtime-chat-7daae.firebaseapp.com",
  projectId: "realtime-chat-7daae",
  storageBucket: "realtime-chat-7daae.firebasestorage.app",
  messagingSenderId: "963181150985",
  appId: "1:963181150985:web:be8bd903c9ecd1cdc089d8",
  measurementId: "G-8Z30DPPMGF",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable persistence
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Firebase persistence setup warning:", err);
});

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signOut() {
  return await fbSignOut(auth);
}

export async function updateUserProfile(user, data) {
  return await fbUpdateProfile(user, data);
}

export function onAuthStateChanged(callback) {
  return fbOnAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

// Sign in anonymously to Firebase for Firestore access when using backend auth
export async function signInAnonymouslyToFirebase() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Error signing in anonymously to Firebase:", error);
    throw error;
  }
}

export { auth, db, firebaseConfig, googleProvider };
