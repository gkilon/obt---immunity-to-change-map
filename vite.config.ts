import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // We only strictly define process.env.API_KEY for the Gemini SDK requirements.
      // Firebase variables (VITE_*) will be accessed automatically via import.meta.env in the code.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
  }
})