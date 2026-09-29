// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ⚠️ REPLACE with your real Firebase web config
// (Firebase Console → Project Settings → General → Your apps → Web app)
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "roamaland.firebaseapp.com",
  databaseURL: "https://roamaland-default-rtdb.firebaseio.com",  // ← REQUIRED
  projectId: "roamaland",
  storageBucket: "roamaland.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Promise that resolves once we have an (anonymous) user
export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) resolve(user);
  });
  signInAnonymously(auth).catch((e) => console.error("Anon auth failed:", e));
});