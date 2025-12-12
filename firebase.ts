import * as firebaseApp from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: החלף את הערכים למטה בערכים שקיבלת במסוף של Firebase
// Go to Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration
const irebaseConfig = {
  apiKey: "AIzaSyC88w5qArQkie1ySYjLNogYOlAysKIopHo",
  authDomain: "obt-tool-fc78d.firebaseapp.com",
  projectId: "obt-tool-fc78d",
  storageBucket: "obt-tool-fc78d.firebasestorage.app",
  messagingSenderId: "57492839456",
  appId: "1:57492839456:web:f787b04ea87e4b9dac3045",
  measurementId: "G-3J3K39XJ3M"
};

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);