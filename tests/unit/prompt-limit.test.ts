import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  getLimitStatus,
  requirePrompt,
  recordPromptUsed,
  resetPromptUsage,
  PromptLimitError,
} from "@/lib/prompt-limit";
import { setPlan, advanceClock, resetClock, PROMPT_WINDOW_MS } from "@/lib/settings";
import { db } from "@/lib/db";

// Covers REQUIREMENTS-v2.md T2.3 to T2.7 and criteria 2.8 to 2.18.
// This is what stands between a runaway loop and a real API bill, so the
// boundaries are tested explicitly.

const MINUTE = 60 * 1000;

beforeEach(async () => {
  await db.promptUsage.deleteMany({});
  await db.settings.deleteMany({});
  await resetClock().catch(() => {});
  await setPlan("Free");
});

afterAll(async () => {
  await db.$disconnect();
});

describe("counting prompts (T2.3)", () => {
  it("starts with a full allowance", async () => {
    const status = await getLimitStatus();

    expect(status.limit).toBe(10);
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(10);
    expect(status.allowed).toBe(true);
    expect(status.resetsAt).toBeNull();
  });

  it("reduces remaining by exactly 1 per prompt (2.11)", async () => {
    await recordPromptUsed("chat");
    expect((await getLimitStatus()).remaining).toBe(9);

    await recordPromptUsed("chat");
    expect((await getLimitStatus()).remaining).toBe(8);
  });

  it("counts prompts from every job together", async () => {
    await recordPromptUsed("chat");
    await recordPromptUsed("essay-ideas");
    await recordPromptUsed("tags");

    const status = await getLimitStatus();
    expect(status.used).toBe(3);
    expect(status.remaining).toBe(7);
  });

  it("opens the window at the first prompt (2.14)", async () => {
    const before = await getLimitStatus();
    expect(before.resetsAt).toBeNull();

    await recordPromptUsed("chat");

    const after = await getLimitStatus();
    expect(after.resetsAt).not.toBeNull();
  });

  it("does not move the reset time when more prompts are spent (2.14)", async () => {
    await recordPromptUsed("chat");
    const firstReset = (await getLimitStatus()).resetsAt!;

    await advanceClock(30 * MINUTE);
    await recordPromptUsed("chat");

    const secondReset = (await getLimitStatus()).resetsAt!;
    expect(secondReset.getTime()).toBe(firstReset.getTime());
  });
});

describe("blocking at the limit (T2.4)", () => {
  it("allows exactly 10 prompts on Free, then refuses (2.9, 2.12)", async () => {
    for (let i = 0; i < 10; i++) {
      await requirePrompt();
      await recordPromptUsed("chat");
    }

    const status = await getLimitStatus();
    expect(status.used).toBe(10);
    expect(status.remaining).toBe(0);
    expect(status.allowed).toBe(false);

    await expect(requirePrompt()).rejects.toThrow(PromptLimitError);
  });

  it("allows 100 on Pro (2.10)", async () => {
    await setPlan("Pro");

    for (let i = 0; i < 100; i++) {
      await recordPromptUsed("chat");
    }

    expect((await getLimitStatus()).remaining).toBe(0);
    await expect(requirePrompt()).rejects.toThrow(PromptLimitError);
  });

  it("tells you when the count resets (2.13)", async () => {
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }

    try {
      await requirePrompt();
      expect.unreachable("should have refused");
    } catch (error) {
      expect(error).toBeInstanceOf(PromptLimitError);
      expect((error as PromptLimitError).resetsAt).toBeInstanceOf(Date);
    }
  });

  it("frees up prompts when the plan moves Free -> Pro", async () => {
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }
    expect((await getLimitStatus()).allowed).toBe(false);

    await setPlan("Pro");

    const status = await getLimitStatus();
    expect(status.limit).toBe(100);
    expect(status.remaining).toBe(90);
    expect(status.allowed).toBe(true);
  });

  it("never reports negative remaining when the plan drops Pro -> Free", async () => {
    await setPlan("Pro");
    for (let i = 0; i < 25; i++) {
      await recordPromptUsed("chat");
    }

    await setPlan("Free");

    const status = await getLimitStatus();
    expect(status.used).toBe(25);
    expect(status.remaining).toBe(0);
    expect(status.remaining).toBeGreaterThanOrEqual(0);
    expect(status.allowed).toBe(false);
  });
});

describe("the 5-hour window (T2.5, T2.6)", () => {
  it("does NOT reset at 4 hours 59 minutes (T2.6)", async () => {
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }

    await advanceClock(PROMPT_WINDOW_MS - MINUTE);

    const status = await getLimitStatus();
    expect(status.used).toBe(10);
    expect(status.allowed).toBe(false);
  });

  it("resets after 5 hours (T2.5, 2.15)", async () => {
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }

    await advanceClock(PROMPT_WINDOW_MS + MINUTE);

    const status = await getLimitStatus();
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(10);
    expect(status.allowed).toBe(true);
    expect(status.resetsAt).toBeNull();
  });

  it("counts from the first prompt, not the last (2.14)", async () => {
    // One prompt now, then more four hours later.
    await recordPromptUsed("chat");
    await advanceClock(4 * 60 * MINUTE);
    await recordPromptUsed("chat");
    await recordPromptUsed("chat");

    expect((await getLimitStatus()).used).toBe(3);

    // 5h01 after the FIRST prompt, that one has aged out but the later
    // two are still inside their own window.
    await advanceClock(61 * MINUTE);

    const status = await getLimitStatus();
    expect(status.used).toBe(2);
  });

  it("gives a fresh allowance after a long quiet period", async () => {
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }

    await advanceClock(24 * 60 * MINUTE);

    const status = await getLimitStatus();
    expect(status.used).toBe(0);
    expect(status.allowed).toBe(true);
  });
});

describe("failed prompts cost nothing (T2.7, 2.17)", () => {
  it("records nothing when recordPromptUsed is never reached", async () => {
    await requirePrompt(); // the check alone spends nothing

    expect((await getLimitStatus()).used).toBe(0);
    expect(await db.promptUsage.count()).toBe(0);
  });

  it("leaves the count untouched after a simulated API failure", async () => {
    await recordPromptUsed("chat");
    const before = await getLimitStatus();

    // A call that throws before recordPromptUsed.
    try {
      await requirePrompt();
      throw new Error("simulated API failure");
    } catch {
      // swallowed, as the real code does
    }

    const after = await getLimitStatus();
    expect(after.used).toBe(before.used);
  });
});

describe("resetPromptUsage", () => {
  it("clears the history", async () => {
    for (let i = 0; i < 5; i++) {
      await recordPromptUsed("chat");
    }

    await resetPromptUsage();

    const status = await getLimitStatus();
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(10);
  });
});
