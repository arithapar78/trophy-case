import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 keeps the database location here instead of in schema.prisma.
// This file configures the Prisma CLI only (db push, studio, seed).
//
// The running app connects separately, through the adapter in src/lib/db.ts.
//
// DATABASE_URL comes from .env.local; the fallback keeps CLI commands
// working even if that file is missing. The path is relative to the
// project root.
const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
