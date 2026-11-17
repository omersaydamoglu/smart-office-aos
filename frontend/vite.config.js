import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Geliştirmede /api isteklerini backend'e (localhost:3000) yönlendirir.
    // Böylece frontend kodunda backend adresini elle yazmamız gerekmez.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
})
