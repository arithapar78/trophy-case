import { describe, it, expect } from "vitest";
import {
  generateEssayIdeas,
  NoAchievementsError,
} from "@/lib/essay-ideas";
import type { Achievement } from "@/lib/achievements";

// Covers REQUIREMENTS.md T.12 and T.13, plus 4.9 to 4.11.
// Every test runs in MOCK mode, so none of these make a network call.

function achievement(title: string, overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: `id-${title}`,
    title,
    date: new Date("2025-03-14"),
    category: "School",
    note: null,
    filePath: null,
    fileName: null,
    fileType: null,
    createdAt: new Date("2025-03-14"),
    updatedAt: new Date("2025-03-14"),
    ...overrides,
  };
}

const sample = [
  achievement("Won the science fair"),
  achievement("Captained the soccer team"),
  achievement("Cooked Thanksgiving dinner"),
  achievement("Painted a library mural"),
  achievement("Volunteered at the shelter"),
  achievement("Taught my brother to ride a bike"),
];

describe("mock mode (T.12, 4.9, 4.10)", () => {
  it("returns exactly 3 ideas", async () => {
    const result = await generateEssayIdeas(sample, { apiKey: "" });
    expect(result.ideas).toHaveLength(3);
  });

  it("flags the result as mock", async () => {
    const result = await generateEssayIdeas(sample, { apiKey: "" });
    expect(result.isMock).toBe(true);
  });

  it("gives every idea a title, a hook and referenced achievements", async () => {
    const { ideas } = await generateEssayIdeas(sample, { apiKey: "" });

    for (const idea of ideas) {
      expect(idea.title.length).toBeGreaterThan(0);
      expect(idea.hook.length).toBeGreaterThan(0);
      expect(Array.isArray(idea.achievements)).toBe(true);
      expect(idea.achievements.length).toBeGreaterThan(0);
    }
  });

  it("gives each idea a one-line hook", async () => {
    const { ideas } = await generateEssayIdeas(sample, { apiKey: "" });

    for (const idea of ideas) {
      expect(idea.hook).not.toContain("\n");
    }
  });

  it("only references achievements that were passed in (T.13, 4.7)", async () => {
    const { ideas } = await generateEssayIdeas(sample, { apiKey: "" });
    const known = new Set(sample.map((a) => a.title));

    for (const idea of ideas) {
      for (const title of idea.achievements) {
        expect(known.has(title), `invented achievement: "${title}"`).toBe(true);
      }
    }
  });

  it("works when there is only one achievement", async () => {
    const { ideas } = await generateEssayIdeas([achievement("A single win")], {
      apiKey: "",
    });

    expect(ideas).toHaveLength(3);
    for (const idea of ideas) {
      expect(idea.achievements).toEqual(["A single win"]);
    }
  });

  it("treats a whitespace-only key as no key", async () => {
    const result = await generateEssayIdeas(sample, { apiKey: "   " });
    expect(result.isMock).toBe(true);
  });
});

describe("with no achievements (4.11)", () => {
  it("refuses rather than calling the AI", async () => {
    await expect(generateEssayIdeas([], { apiKey: "" })).rejects.toThrow(
      NoAchievementsError,
    );
  });

  it("explains what to do", async () => {
    await expect(generateEssayIdeas([])).rejects.toThrow(
      /Add a few achievements first/,
    );
  });
});
