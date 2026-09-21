import { defineConfig, devices } from '@playwright/test'

// End-to-end tests drive a real browser at iPhone size against a production
// build of the app (the same files GitHub Pages serves), so offline mode and
// Home Screen install can be tested for real. Chromium is used with an
// iPhone-sized, touch-enabled viewport so the tests run anywhere Chromium
// can be installed.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  projects: [
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        baseURL: 'http://localhost:4173',
        // Normally unset: Playwright uses the browser it downloaded. Set it
        // to point at an already-installed Chromium instead.
        launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
})
