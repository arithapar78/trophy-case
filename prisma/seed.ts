/**
 * Adds 8 sample achievements so the app has something to show right away.
 *
 * Run with:  npm run seed
 *
 * Running it twice replaces the samples rather than duplicating them.
 * These belong to a made-up student, "Maya Ramirez".
 */
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
});

const SAMPLE_ACHIEVEMENTS = [
  {
    title: "First place, regional science fair",
    date: new Date("2025-03-14"),
    category: "School",
    note: "Built a low-cost air quality sensor and tested it in three classrooms. Judges liked that I collected two months of real data.",
  },
  {
    title: "Varsity soccer team captain",
    date: new Date("2024-09-02"),
    category: "Sports",
    note: "Voted in by teammates. Ran warmups and organised the carpool schedule for away games.",
  },
  {
    title: "Semifinalist, state debate championship",
    date: new Date("2025-02-08"),
    category: "Debate",
    note: "Topic was municipal water policy. Lost the semi on a 2-1 split.",
  },
  {
    title: "Cooked Thanksgiving dinner for 12 people",
    date: new Date("2024-11-28"),
    category: "Cooking",
    note: "Planned the menu, did the shopping, and managed the oven schedule myself. Only one thing burned.",
  },
  {
    title: "Mural for the public library children's wing",
    date: new Date("2024-06-21"),
    category: "Arts",
    note: "Four weekends of painting. The librarian asked me to sign the corner.",
  },
  {
    title: "Scored 1480 on the SAT",
    date: new Date("2025-05-03"),
    category: "School",
    note: "Second attempt, up 90 points from the first.",
  },
  {
    title: "Taught my little brother to ride a bike",
    date: new Date("2024-07-15"),
    category: "Other",
    note: "Took four afternoons. He fell a lot and kept going.",
  },
  {
    title: "Volunteered 50 hours at the animal shelter",
    date: new Date("2025-01-20"),
    category: "Other",
    note: "Mostly dog walking and cleaning kennels. Helped three dogs get adopted by writing their profile cards.",
  },
];

async function main() {
  console.log("Seeding sample achievements...");

  // Clear old samples so running this twice doesn't pile up duplicates.
  const deleted = await db.achievement.deleteMany({});
  if (deleted.count > 0) {
    console.log(`  Removed ${deleted.count} existing achievement(s).`);
  }

  for (const achievement of SAMPLE_ACHIEVEMENTS) {
    await db.achievement.create({ data: achievement });
    console.log(`  + ${achievement.title}`);
  }

  console.log(`\nDone. Added ${SAMPLE_ACHIEVEMENTS.length} sample achievements.`);
  console.log("Run `npm run dev` and open http://localhost:3000 to see them.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
