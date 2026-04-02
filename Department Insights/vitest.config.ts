import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000, // 10 seconds for tests that read CSV files
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
