import { defineConfig, devices } from '@playwright/test'

// End-to-end tests drive a real browser at iPhone size against the dev server.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    ...devices['iPhone 14'],
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
