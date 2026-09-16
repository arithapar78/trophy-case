import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievement,
  listAchievements,
  ValidationError,
  NotFoundError,
} from "@/lib/achievements";
import { db } from "@/lib/db";

// Covers REQUIREMENTS.md T.1 through T.11.

const validInput = {
  title: "Won the regional science fair",
  date: new Date("2025-03-14"),
  category: "School",
  note: "First place in physics.",
};

beforeEach(async () => {
  // Each test starts from an empty table so they can't affect each other.
  await db.achievement.deleteMany({});
});

afterAll(async () => {
  await db.$disconnect();
});

describe("createAchievement (T.1, T.2)", () => {
  it("saves an achievement with valid data", async () => {
    const created = await createAchievement(validInput);

    expect(created.id).toBeTruthy();
    expect(created.title).toBe("Won the regional science fair");
    expect(created.category).toBe("School");
    expect(created.note).toBe("First place in physics.");
    expect(created.date.toISOString().slice(0, 10)).toBe("2025-03-14");
  });

  it("saves an achievement with only the required fields", async () => {
    const created = await createAchievement({
      title: "Learned to poach an egg",
      date: new Date("2025-01-02"),
      category: "Cooking",
    });

    expect(created.title).toBe("Learned to poach an egg");
    expect(created.note).toBeNull();
    expect(created.filePath).toBeNull();
  });

  it("trims whitespace from the title", async () => {
    const created = await createAchievement({
      ...validInput,
      title: "  Padded title  ",
    });

    expect(created.title).toBe("Padded title");
  });

  it("stores an attachment when one is given", async () => {
    const created = await createAchievement(validInput, {
      filePath: "abc123.jpg",
      fileName: "certificate.jpg",
      fileType: "image/jpeg",
    });

    expect(created.filePath).toBe("abc123.jpg");
    expect(created.fileName).toBe("certificate.jpg");
    expect(created.fileType).toBe("image/jpeg");
  });

  it("rejects an empty title and saves nothing", async () => {
    await expect(
      createAchievement({ ...validInput, title: "" }),
    ).rejects.toThrow(ValidationError);

    expect(await db.achievement.count()).toBe(0);
  });

  it("rejects a title longer than 120 characters", async () => {
    await expect(
      createAchievement({ ...validInput, title: "a".repeat(121) }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a future date", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await expect(
      createAchievement({ ...validInput, date: tomorrow }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a note longer than 500 characters", async () => {
    await expect(
      createAchievement({ ...validInput, note: "a".repeat(501) }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a category outside the six allowed values", async () => {
    await expect(
      createAchievement({ ...validInput, category: "Skateboarding" }),
    ).rejects.toThrow(ValidationError);
  });

  it("reports the bad field by name", async () => {
    try {
      await createAchievement({ ...validInput, title: "" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fieldErrors.title).toBe(
        "Please add a title.",
      );
    }
  });
});

describe("updateAchievement (T.3, T.4)", () => {
  it("changes the stored values", async () => {
    const created = await createAchievement(validInput);

    const updated = await updateAchievement(created.id, {
      title: "Won the state science fair",
      date: new Date("2025-04-01"),
      category: "School",
      note: "Moved up from regionals.",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe("Won the state science fair");
    expect(updated.note).toBe("Moved up from regionals.");
    expect(updated.date.toISOString().slice(0, 10)).toBe("2025-04-01");
  });

  it("can change the category", async () => {
    const created = await createAchievement(validInput);
    const updated = await updateAchievement(created.id, {
      ...validInput,
      category: "Arts",
    });

    expect(updated.category).toBe("Arts");
  });

  it("leaves the attachment alone when none is specified", async () => {
    const created = await createAchievement(validInput, {
      filePath: "abc123.jpg",
      fileName: "certificate.jpg",
      fileType: "image/jpeg",
    });

    const updated = await updateAchievement(created.id, {
      ...validInput,
      title: "New title",
    });

    expect(updated.filePath).toBe("abc123.jpg");
  });

  it("removes the attachment when given null", async () => {
    const created = await createAchievement(validInput, {
      filePath: "abc123.jpg",
      fileName: "certificate.jpg",
      fileType: "image/jpeg",
    });

    const updated = await updateAchievement(created.id, validInput, null);

    expect(updated.filePath).toBeNull();
    expect(updated.fileName).toBeNull();
    expect(updated.fileType).toBeNull();
  });

  it("replaces the attachment when given a new file", async () => {
    const created = await createAchievement(validInput, {
      filePath: "old.jpg",
      fileName: "old.jpg",
      fileType: "image/jpeg",
    });

    const updated = await updateAchievement(created.id, validInput, {
      filePath: "new.pdf",
      fileName: "new.pdf",
      fileType: "application/pdf",
    });

    expect(updated.filePath).toBe("new.pdf");
    expect(updated.fileType).toBe("application/pdf");
  });

  it("rejects invalid data and leaves the original untouched", async () => {
    const created = await createAchievement(validInput);

    await expect(
      updateAchievement(created.id, { ...validInput, title: "" }),
    ).rejects.toThrow(ValidationError);

    const unchanged = await getAchievement(created.id);
    expect(unchanged?.title).toBe("Won the regional science fair");
  });

  it("fails cleanly for an id that doesn't exist", async () => {
    await expect(
      updateAchievement("does-not-exist", validInput),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("deleteAchievement (T.5, T.6)", () => {
  it("removes the achievement", async () => {
    const created = await createAchievement(validInput);

    await deleteAchievement(created.id);

    expect(await getAchievement(created.id)).toBeNull();
    expect(await db.achievement.count()).toBe(0);
  });

  it("leaves other achievements in place", async () => {
    const first = await createAchievement(validInput);
    await createAchievement({ ...validInput, title: "Second achievement" });

    await deleteAchievement(first.id);

    const remaining = await listAchievements();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe("Second achievement");
  });

  it("fails cleanly for an id that doesn't exist", async () => {
    await expect(deleteAchievement("does-not-exist")).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("listAchievements (T.7 to T.11)", () => {
  beforeEach(async () => {
    // A small, deliberately mixed timeline to filter and search against.
    await createAchievement({
      title: "Regional debate final",
      date: new Date("2025-02-08"),
      category: "Debate",
      note: "Municipal water policy.",
    });
    await createAchievement({
      title: "Varsity soccer captain",
      date: new Date("2024-09-02"),
      category: "Sports",
      note: "Voted in by teammates.",
    });
    await createAchievement({
      title: "Regional swim meet",
      date: new Date("2025-05-03"),
      category: "Sports",
      note: "Personal best in freestyle.",
    });
    await createAchievement({
      title: "School play lead role",
      date: new Date("2024-11-20"),
      category: "Arts",
    });
  });

  it("returns achievements newest first (T.11)", async () => {
    const all = await listAchievements();

    expect(all.map((a) => a.title)).toEqual([
      "Regional swim meet",
      "Regional debate final",
      "School play lead role",
      "Varsity soccer captain",
    ]);
  });

  it("puts the more recently created one first when dates tie (2.3)", async () => {
    await db.achievement.deleteMany({});

    const first = await createAchievement({
      title: "Created first",
      date: new Date("2025-01-01"),
      category: "Other",
    });
    const second = await createAchievement({
      title: "Created second",
      date: new Date("2025-01-01"),
      category: "Other",
    });

    const all = await listAchievements();
    expect(all[0].id).toBe(second.id);
    expect(all[1].id).toBe(first.id);
  });

  it("filters by category (T.7)", async () => {
    const sports = await listAchievements({ category: "Sports" });

    expect(sports).toHaveLength(2);
    expect(sports.every((a) => a.category === "Sports")).toBe(true);
  });

  it("returns everything for category All", async () => {
    const all = await listAchievements({ category: "All" });
    expect(all).toHaveLength(4);
  });

  it("returns an empty list for a category with no achievements", async () => {
    const cooking = await listAchievements({ category: "Cooking" });
    expect(cooking).toEqual([]);
  });

  it("searches the title (T.8)", async () => {
    const results = await listAchievements({ search: "swim" });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Regional swim meet");
  });

  it("ignores capitalization when searching (T.8, 2.12)", async () => {
    const lower = await listAchievements({ search: "debate" });
    const upper = await listAchievements({ search: "DEBATE" });
    const mixed = await listAchievements({ search: "DeBaTe" });

    expect(lower).toHaveLength(1);
    expect(upper).toHaveLength(1);
    expect(mixed).toHaveLength(1);
  });

  it("searches the note as well as the title (T.9)", async () => {
    const results = await listAchievements({ search: "freestyle" });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Regional swim meet");
  });

  it("matches partial words", async () => {
    const results = await listAchievements({ search: "Regional" });
    expect(results).toHaveLength(2);
  });

  it("combines filter and search (T.10, 2.13)", async () => {
    const results = await listAchievements({
      category: "Sports",
      search: "regional",
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Regional swim meet");
  });

  it("returns an empty list when nothing matches (2.14)", async () => {
    const results = await listAchievements({ search: "xyzzy-no-match" });
    expect(results).toEqual([]);
  });

  it("ignores a blank search", async () => {
    const results = await listAchievements({ search: "   " });
    expect(results).toHaveLength(4);
  });
});
