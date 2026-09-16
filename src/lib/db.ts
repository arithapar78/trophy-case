import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// The one and only database connection. Never create a PrismaClient
// anywhere else — see CLAUDE.md.
//
// Next.js reloads your code on every edit during development. Without the
// globalThis trick below, each reload would open a brand new database
// connection and we would quickly run out.

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
