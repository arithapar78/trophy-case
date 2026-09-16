import { describe, it, expect } from "vitest";
import {
  achievementSchema,
  validateFile,
  endOfToday,
  CATEGORIES,
} from "@/lib/validation";

// Covers REQUIREMENTS.md T.1 and T.2 for the validation rules.
// Tests for creating, editing, deleting and filtering come with their features.

describe("achievement validation", () => {
  const validInput = {
    title: "Won the regional science fair",
    date: new Date("2025-03-14"),
    category: "School" as const,
    note: "First place in the physics category.",
  };

  it("accepts a complete, valid achievement", () => {
    const result = achievementSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts an achievement with only the required fields", () => {
    const result = achievementSchema.safeParse({
      title: "Learned to poach an egg",
      date: new Date("2025-01-02"),
      category: "Cooking",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = achievementSchema.safeParse({ ...validInput, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please add a title.");
    }
  });

  it("rejects a title that is only whitespace", () => {
    const result = achievementSchema.safeParse({ ...validInput, title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 120 characters", () => {
    const result = achievementSchema.safeParse({
      ...validInput,
      title: "a".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a title of exactly 120 characters", () => {
    const result = achievementSchema.safeParse({
      ...validInput,
      title: "a".repeat(120),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a date in the future", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = achievementSchema.safeParse({ ...validInput, date: tomorrow });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("The date can't be in the future.");
    }
  });

  it("accepts today's date", () => {
    const result = achievementSchema.safeParse({ ...validInput, date: new Date() });
    expect(result.success).toBe(true);
  });

  it("rejects a note longer than 500 characters", () => {
    const result = achievementSchema.safeParse({
      ...validInput,
      note: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a category that is not one of the six", () => {
    const result = achievementSchema.safeParse({
      ...validInput,
      category: "Skateboarding",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every one of the six categories", () => {
    for (const category of CATEGORIES) {
      const result = achievementSchema.safeParse({ ...validInput, category });
      expect(result.success, `category ${category} should be valid`).toBe(true);
    }
  });
});

describe("endOfToday", () => {
  it("returns the last millisecond of the given day", () => {
    const result = endOfToday(new Date("2025-06-15T08:30:00"));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});

describe("file validation", () => {
  it("accepts a JPEG under the size limit", () => {
    expect(validateFile({ size: 1_000_000, type: "image/jpeg" })).toBeNull();
  });

  it("accepts a PDF", () => {
    expect(validateFile({ size: 500_000, type: "application/pdf" })).toBeNull();
  });

  it("rejects a file type that is not an image or PDF", () => {
    expect(validateFile({ size: 1000, type: "application/zip" })).toMatch(
      /Only images/,
    );
  });

  it("rejects a file larger than 10 MB", () => {
    expect(validateFile({ size: 11 * 1024 * 1024, type: "image/png" })).toMatch(
      /too big/,
    );
  });

  it("accepts a file of exactly 10 MB", () => {
    expect(validateFile({ size: 10 * 1024 * 1024, type: "image/png" })).toBeNull();
  });
});
