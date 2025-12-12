// @ts-ignore
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// קבלת ההגדרות שהוזרקו דרך vite.config.ts
// זה מבטיח שהמשתנה קיים ולא יהיה undefined
// @ts-ignore
// Fix: Cast to any because Vite replaces this with an object literal, but TS sees it as a string
const firebaseConfig = process.env.FIREBASE_CONFIG as any;

if (!firebaseConfig || !firebaseConfig.apiKey) {
  console.error("Critical Error: Firebase config failed to load.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);