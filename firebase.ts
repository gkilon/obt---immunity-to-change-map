// @ts-ignore
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ============================================================================
// 🔥 הגדרות Firebase
// ============================================================================
// מומלץ: הגדר את המשתנים האלו ב-Netlify (Environment Variables) כדי לשמור על קוד נקי.
// אם הם לא מוגדרים ב-Netlify, המערכת תנסה להשתמש בערכים המקודדים למטה.

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID"
};

// בדיקה האם הקונפיגורציה תקינה
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

if (!isConfigValid) {
  console.warn("⚠️ הגדרות Firebase חסרות. ההתחברות לא תעבוד עד לעדכון הקובץ או הגדרת משתני סביבה.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);