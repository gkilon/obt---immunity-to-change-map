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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);