import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // ✅ React core — loads once, cached forever by browser
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // ✅ Recharts — 359KB beast, now only loads on Dashboard/Report pages
          'vendor-charts': ['recharts'],

          // ✅ Other heavy libs split separately
          'vendor-misc': ['axios', 'socket.io-client', 'react-hot-toast'],

          // ✅ Icon libraries split out (these are surprisingly large)
          'vendor-icons': ['lucide-react', 'react-icons', '@fortawesome/react-fontawesome', '@fortawesome/fontawesome-svg-core'],
        }
      }
    }
  }
})