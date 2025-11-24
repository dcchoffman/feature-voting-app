import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/feature-voting-app',
  plugins: [react()],
  build: {
    rollupOptions: {
      // Ensure 404.html is copied to dist
    }
  }
})