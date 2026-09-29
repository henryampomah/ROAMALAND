// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ⚠️ REPLACE with your real Firebase web config
// (Firebase Console → Project Settings → General → Your apps → Web app)
const firebaseConfig = {
  apiKey: "AIzaSyDacSBDECfc8ZF4wBeI_LikkI2ZJBOVbQs",
  authDomain: "roamaland.firebaseapp.com",
  databaseURL: "https://roamaland-default-rtdb.firebaseio.com",
  projectId: "roamaland",
  storageBucket: "roamaland.firebasestorage.app",
  messagingSenderId: "1054433997005",
  appId: "1:1054433997005:web:5bb4c2020e5ae3ead17984",
  measurementId: "G-5FEHZ93P4T"
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