import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // מגדיר את הקונפיגורציה: קודם מנסה לקחת מ-.env, אם אין - משתמש בערכים שסיפקת
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCDXwR09IXxLKqtwzB21n23YwPfoMDtfcI",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "obt-tool.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "obt-tool",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "obt-tool.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "36014488614",
    appId: env.VITE_FIREBASE_APP_ID || "1:36014488614:web:a21e943f236c0eced03ae7",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-63KDFJERHK"
  };

  return {
    plugins: [react()],
    define: {
      // הזרקת המשתנים לקוד בצורה בטוחה שתעבוד בכל דפדפן
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY),
      'process.env.FIREBASE_CONFIG': JSON.stringify(firebaseConfig)
    },
  }
})