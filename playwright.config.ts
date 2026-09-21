import { defineConfig, devices } from '@playwright/test'

// End-to-end tests drive a real browser at iPhone size against the dev server.
// Chromium is used with an iPhone-sized, touch-enabled viewport so the tests
// run anywhere Chromium can be installed.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  projects: [
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        baseURL: 'http://localhost:5173',
        // Normally unset: Playwright uses the browser it downloaded. Set it
        // to point at an already-installed Chromium instead.
        launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
