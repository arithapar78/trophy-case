/**
 * Adds 8 sample achievements so the app has something to show right away.
 *
 * Run with:  npm run seed
 *
 * Running it twice replaces the samples rather than duplicating them.
 * These belong to a made-up student, "Maya Ramirez", and have no photos —
 * photos come from your own camera.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
});

/** A calendar day, pinned to midday UTC so it displays correctly everywhere. */
function day(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

const SAMPLE_ACHIEVEMENTS = [
  {
    title: "First place, regional science fair",
    date: day("2025-03-14"),
    category: "School",
    note: "Built a low-cost air quality sensor and tested it in three classrooms. Judges liked that I collected two months of real data.",
  },
  {
    title: "Varsity soccer team captain",
    date: day("2024-09-02"),
    category: "Sports",
    note: "Voted in by teammates. Ran warmups and organised the carpool schedule for away games.",
  },
  {
    title: "Semifinalist, state debate championship",
    date: day("2025-02-08"),
    category: "Debate",
    note: "Topic was municipal water policy. Lost the semi on a 2-1 split.",
  },
  {
    title: "Cooked Thanksgiving dinner for 12 people",
    date: day("2024-11-28"),
    category: "Cooking",
    note: "Planned the menu, did the shopping, and managed the oven schedule myself. Only one thing burned.",
  },
  {
    title: "Mural for the public library children's wing",
    date: day("2024-06-21"),
    category: "Arts",
    note: "Four weekends of painting. The librarian asked me to sign the corner.",
  },
  {
    title: "Scored 1480 on the SAT",
    date: day("2025-05-03"),
    category: "School",
    note: "Second attempt, up 90 points from the first.",
  },
  {
    title: "Ran a 5K in under 22 minutes",
    date: day("2025-04-12"),
    category: "Sports",
    note: "21:47 at the spring charity run. Beat my goal by 13 seconds.",
  },
  {
    title: "Taught my grandmother to video call",
    date: day("2024-12-15"),
    category: "Other",
    note: "Wrote her a one-page guide with big print. She calls every Sunday now.",
  },
];

async function main() {
  // Clear the samples first so running this twice doesn't duplicate them.
  await db.achievement.deleteMany({});

  for (const achievement of SAMPLE_ACHIEVEMENTS) {
    await db.achievement.create({ data: achievement });
  }

  console.log(`Added ${SAMPLE_ACHIEVEMENTS.length} sample achievements.`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
