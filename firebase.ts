// @ts-ignore
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Helper to safely access Vite environment variables
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return "";
};

const rawConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

// Check if config is present
const hasConfig = !!rawConfig.apiKey && rawConfig.apiKey !== "" && !rawConfig.apiKey.includes("undefined");

if (!hasConfig) {
  console.warn("⚠️ Firebase configuration is missing or invalid. App running in offline/demo mode.");
  console.warn("Please check your .env file and ensure VITE_FIREBASE_API_KEY is set.");
}

// Use rawConfig if valid, otherwise use a dummy config to prevent initialization crash.
// This allows the UI to load so we can show a nice error message to the user later.
const firebaseConfig = hasConfig ? rawConfig : {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "00000000000",
  appId: "1:00000000000:web:00000000000000"
};

// Initialize Firebase
// If the config is dummy, this succeeds but auth operations will fail gracefully later.
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);