import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Essential for Electron to find assets
  server: {
    port: 5173,
    strictPort: true,
  }
})