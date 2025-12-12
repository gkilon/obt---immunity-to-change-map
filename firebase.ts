// @ts-ignore
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- הוראות הגדרה ---
// 1. לך אל https://console.firebase.google.com
// 2. צור פרויקט חדש
// 3. הוסף אפליקציית Web
// 4. העתק את ה-Config והדבק במקום הערכים למטה

const firebaseConfig = {
  // החלף את הערכים הללו בערכים האמיתיים שלך מ-Firebase
  apiKey: "AAIzaSyDgjGk6q8BUieAGCybYdTOBpiUIxm8JXw0",
  authDomain: "obt-tool-fc78d.firebaseapp.com",
  projectId: "obt-tool-fc78d",
  storageBucket: "obt-tool-fc78d.firebasestorage.app",
  messagingSenderId: "57492839456",
  appId: "1:57492839456:web:f787b04ea87e4b9dac3045",
  measurementId: "G-3J3K39XJ3M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);