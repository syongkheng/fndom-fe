import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Test-only config: kept separate from vite.config.ts so the devtools plugin
// isn't loaded under vitest.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Don't load the project's .env files under test; components only need a
  // placeholder base URL.
  envDir: fileURLToPath(new URL('./node_modules/.vitest-no-env', import.meta.url)),
  test: {
    environment: 'jsdom',
    env: { VITE_SERVER_BASE_URL: 'http://api.test.invalid' },
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/__tests__/**/*.test.ts'],
    css: false,
    server: { deps: { inline: ['element-plus'] } },
  },
})
