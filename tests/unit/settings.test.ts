import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  getSettings,
  setPlan,
  getPromptLimit,
  advanceClock,
  resetClock,
  now,
  isPlan,
  PROMPT_LIMITS,
  PROMPT_WINDOW_MS,
} from "@/lib/settings";
import { createAchievement } from "@/lib/achievements";
import { db } from "@/lib/db";

// Covers REQUIREMENTS-v2.md T2.1, T2.2 and the fake clock (2.18, 9.11).

beforeEach(async () => {
  await db.settings.deleteMany({});
  await db.achievement.deleteMany({});
});

afterAll(async () => {
  await db.$disconnect();
});

describe("plan storage (T2.1)", () => {
  it("defaults to Free on a fresh install", async () => {
    const settings = await getSettings();
    expect(settings.plan).toBe("Free");
  });

  it("creates the settings row on first read rather than erroring", async () => {
    expect(await db.settings.count()).toBe(0);
    await getSettings();
    expect(await db.settings.count()).toBe(1);
  });

  it("saves a plan change and reads it back", async () => {
    await setPlan("Pro");
    expect((await getSettings()).plan).toBe("Pro");

    await setPlan("Free");
    expect((await getSettings()).plan).toBe("Free");
  });

  it("keeps exactly one settings row however many times it's read", async () => {
    await getSettings();
    await getSettings();
    await setPlan("Pro");
    await getSettings();

    expect(await db.settings.count()).toBe(1);
  });

  it("rejects a plan that isn't Free or Pro", async () => {
    // @ts-expect-error deliberately wrong, to check the runtime guard
    await expect(setPlan("Enterprise")).rejects.toThrow();
  });

  it("falls back to Free if the stored value is somehow invalid", async () => {
    await getSettings();
    // Simulate a hand-edited database.
    await db.settings.update({
      where: { id: "singleton" },
      data: { plan: "Nonsense" },
    });

    expect((await getSettings()).plan).toBe("Free");
  });
});

describe("prompt limits (T2.2)", () => {
  it("gives Free 10 prompts", async () => {
    await setPlan("Free");
    expect(await getPromptLimit()).toBe(10);
    expect(PROMPT_LIMITS.Free).toBe(10);
  });

  it("gives Pro 100 prompts", async () => {
    await setPlan("Pro");
    expect(await getPromptLimit()).toBe(100);
    expect(PROMPT_LIMITS.Pro).toBe(100);
  });

  it("changes the limit as soon as the plan changes (1.7, 1.8)", async () => {
    await setPlan("Free");
    expect(await getPromptLimit()).toBe(10);

    await setPlan("Pro");
    expect(await getPromptLimit()).toBe(100);

    await setPlan("Free");
    expect(await getPromptLimit()).toBe(10);
  });

  it("uses a 5-hour window", () => {
    expect(PROMPT_WINDOW_MS).toBe(5 * 60 * 60 * 1000);
  });
});

describe("changing the plan leaves achievements alone (1.10)", () => {
  it("keeps every achievement through a plan switch", async () => {
    await createAchievement({
      title: "Survives a plan change",
      date: new Date("2025-03-14"),
      category: "School",
      note: "Still here.",
    });

    await setPlan("Pro");
    await setPlan("Free");
    await setPlan("Pro");

    const remaining = await db.achievement.findMany();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe("Survives a plan change");
    expect(remaining[0].note).toBe("Still here.");
  });
});

describe("the fake clock (2.18, 9.11)", () => {
  it("starts at real time", async () => {
    const appTime = await now();
    expect(Math.abs(appTime.getTime() - Date.now())).toBeLessThan(2000);
  });

  it("moves forward by the amount given", async () => {
    const before = await now();
    await advanceClock(5 * 60 * 60 * 1000);
    const after = await now();

    const moved = after.getTime() - before.getTime();
    // Allow a little slack for the time the test itself takes.
    expect(moved).toBeGreaterThan(5 * 60 * 60 * 1000 - 2000);
    expect(moved).toBeLessThan(5 * 60 * 60 * 1000 + 2000);
  });

  it("adds up across several advances", async () => {
    const before = await now();
    await advanceClock(60 * 60 * 1000);
    await advanceClock(60 * 60 * 1000);
    const after = await now();

    expect(after.getTime() - before.getTime()).toBeGreaterThan(
      2 * 60 * 60 * 1000 - 2000,
    );
  });

  it("can move far enough to test 60-day expiry", async () => {
    const before = await now();
    await advanceClock(61 * 24 * 60 * 60 * 1000);
    const after = await now();

    const daysMoved =
      (after.getTime() - before.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysMoved).toBeGreaterThan(60);
  });

  it("goes back to real time when reset", async () => {
    await advanceClock(10 * 60 * 60 * 1000);
    await resetClock();

    const appTime = await now();
    expect(Math.abs(appTime.getTime() - Date.now())).toBeLessThan(2000);
  });

  it("survives a plan change", async () => {
    await advanceClock(3 * 60 * 60 * 1000);
    await setPlan("Pro");

    const { clockOffsetMs } = await getSettings();
    expect(clockOffsetMs).toBe(3 * 60 * 60 * 1000);
  });
});

describe("isPlan", () => {
  it("accepts the two real plans", () => {
    expect(isPlan("Free")).toBe(true);
    expect(isPlan("Pro")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isPlan("free")).toBe(false);
    expect(isPlan("Enterprise")).toBe(false);
    expect(isPlan("")).toBe(false);
    expect(isPlan(null)).toBe(false);
    expect(isPlan(42)).toBe(false);
  });
});
