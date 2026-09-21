import { defineConfig } from 'vitest/config'

// Unit tests live in tests/unit and run in a fake browser (jsdom) so code
// that touches the DOM or browser storage can be tested without opening a
// real browser. The e2e folder is excluded: Playwright runs those.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
})
