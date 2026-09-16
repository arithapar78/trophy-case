import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";


export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // Only unit tests. Playwright runs the e2e folder itself.
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    globals: true,
    // Point the tests at a throwaway database before any test file loads.
    setupFiles: ["./tests/unit/setup-db.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
