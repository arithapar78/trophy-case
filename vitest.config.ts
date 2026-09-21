import { defineConfig } from 'vitest/config'

// Unit tests live in tests/unit and run in Node with a fake IndexedDB, so the
// database code can be tested without opening a real browser. A test that
// needs a DOM can opt into jsdom with a "@vitest-environment jsdom" comment.
// The e2e folder is excluded: Playwright runs those.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
})
