import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Try to find the API key in various common environment variable names
  // This ensures that if the user has VITE_API_KEY set (which worked before), we use it.
  const apiKey = env.API_KEY || env.VITE_API_KEY || env.GOOGLE_GENAI_API_KEY || env.REACT_APP_API_KEY;

  return {
    plugins: [react()],
    define: {
      // Define process.env.API_KEY globally for the browser
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  }
})