import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'test-results/**', 'playwright-report/**'],
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
