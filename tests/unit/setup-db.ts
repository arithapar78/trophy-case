/**
 * Gives the unit tests their own throwaway database.
 *
 * Tests must never touch prisma/dev.db — your real achievements. This runs
 * before the test files are imported and points DATABASE_URL at a temporary
 * file instead, which is created fresh and deleted afterwards.
 */
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const testDir = mkdtempSync(path.join(tmpdir(), "trophy-case-test-"));
const testDbPath = path.join(testDir, "test.db");
const testDbUrl = `file:${testDbPath}`;

// src/lib/db.ts reads this when it opens its connection.
process.env.DATABASE_URL = testDbUrl;

// Build the tables in the empty test database. --url overrides whatever
// prisma.config.ts would otherwise use, so the real database is never touched.
execSync(`npx prisma db push --url="${testDbUrl}"`, { stdio: "pipe" });

export function cleanupTestDatabase() {
  rmSync(testDir, { recursive: true, force: true });
}
