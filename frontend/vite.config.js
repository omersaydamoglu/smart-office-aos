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
  // Testler (npm test): tarayıcı yerine jsdom'da çalışır. Mock modu kapalıdır;
  // gerçek API kodu kullanılır, ağ istekleri testlerde taklit edilir (src/test/api.js).
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    env: { VITE_USE_MOCK: 'false' },
    css: false,
    restoreMocks: true,
  },
})
