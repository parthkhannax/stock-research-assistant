import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    base: '/stock-research-assistant/',
    plugins: [react()],

    define: {
      // Map VITE_GEMINI_API_KEY to process.env.API_KEY for geminiService.ts compatibility
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-ai': ['@google/genai'],
            'vendor-db': ['@instantdb/react'],
          },
        },
      },
    },
  }
})
