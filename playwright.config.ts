import { defineConfig, devices } from '@playwright/test'

// End-to-end tests drive a real browser at iPhone size against a production
// build of the app (the same files GitHub Pages serves), so offline mode and
// Home Screen install can be tested for real. Chromium is used with an
// iPhone-sized, touch-enabled viewport so the tests run anywhere Chromium
// can be installed.
const phone = {
  ...devices['iPhone 14'],
  browserName: 'chromium' as const,
  // Normally unset: Playwright uses the browser it downloaded. Set it to
  // point at an already-installed Chromium instead.
  launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH },
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  projects: [
    {
      // The app as it actually ships: selling switched off.
      name: 'iphone',
      use: { ...phone, baseURL: 'http://localhost:4173' },
      testIgnore: 'plan.spec.ts',
    },
    {
      // The same app with ENABLE_PRO set, so Phase 6's upgrade flow keeps
      // being tested end to end even though nothing is for sale today. It
      // builds into its own folder so the two servers never race.
      name: 'iphone-pro',
      use: { ...phone, baseURL: 'http://localhost:4174' },
      testMatch: 'plan.spec.ts',
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
    },
    {
      command: 'npx vite build --outDir dist-pro && npx vite preview --outDir dist-pro --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: false,
      env: { ENABLE_PRO: '1' },
    },
  ],
})
