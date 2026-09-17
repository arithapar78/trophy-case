import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  sendHelperMessage,
  getConversation,
  clearConversation,
  HelperError,
  HELPER_MODEL,
} from "@/lib/helper";
import {
  fingerprintAchievements,
  buildCacheKey,
  clearAnswerCache,
} from "@/lib/answer-cache";
import { getLimitStatus, recordPromptUsed } from "@/lib/prompt-limit";
import { createAchievement, updateAchievement, listAchievements } from "@/lib/achievements";
import { setPlan, resetClock } from "@/lib/settings";
import { db } from "@/lib/db";

// Covers REQUIREMENTS-v2.md T2.8, T2.9, T2.25, T2.26 and criteria 2.19 to 2.23.
// Every test runs in MOCK mode (apiKey: ""), so none makes a network call.

beforeEach(async () => {
  await db.helperMessage.deleteMany({});
  await db.cachedAnswer.deleteMany({});
  await db.promptUsage.deleteMany({});
  await db.achievement.deleteMany({});
  await db.settings.deleteMany({});
  await resetClock().catch(() => {});
  await setPlan("Free");
});

afterAll(async () => {
  await db.$disconnect();
});

describe("the model (T2.26, rule E.1)", () => {
  it("uses claude-haiku-4-5", () => {
    expect(HELPER_MODEL).toBe("claude-haiku-4-5");
  });
});

describe("MOCK mode (T2.25, 2.22, 2.23)", () => {
  it("replies without an API key", async () => {
    const { message } = await sendHelperMessage("What should I write about?", {
      apiKey: "",
    });

    expect(message.role).toBe("assistant");
    expect(message.content.length).toBeGreaterThan(0);
  });

  it("labels the reply as a sample", async () => {
    const { message } = await sendHelperMessage("Hello", { apiKey: "" });

    expect(message.isMock).toBe(true);
    expect(message.content).toMatch(/Sample answer/i);
  });

  it("spends no prompt, because no API call is made (2.23)", async () => {
    await sendHelperMessage("One", { apiKey: "" });
    await sendHelperMessage("Two", { apiKey: "" });
    await sendHelperMessage("Three", { apiKey: "" });

    const status = await getLimitStatus();
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(10);
  });

  it("treats a whitespace-only key as no key", async () => {
    const { message } = await sendHelperMessage("Hello", { apiKey: "   " });
    expect(message.isMock).toBe(true);
  });

  it("refuses an empty message", async () => {
    await expect(sendHelperMessage("   ", { apiKey: "" })).rejects.toThrow(
      HelperError,
    );
  });
});

describe("the conversation (2.3, 2.5, 2.6, 2.7)", () => {
  it("saves both the question and the reply", async () => {
    await sendHelperMessage("What are my strengths?", { apiKey: "" });

    const conversation = await getConversation();
    expect(conversation).toHaveLength(2);
    expect(conversation[0].role).toBe("user");
    expect(conversation[0].content).toBe("What are my strengths?");
    expect(conversation[1].role).toBe("assistant");
  });

  it("keeps messages in order across several turns", async () => {
    await sendHelperMessage("First", { apiKey: "" });
    await sendHelperMessage("Second", { apiKey: "" });

    const conversation = await getConversation();
    expect(conversation).toHaveLength(4);
    expect(conversation.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(conversation[0].content).toBe("First");
    expect(conversation[2].content).toBe("Second");
  });

  it("survives being read again, so it persists (2.6)", async () => {
    await sendHelperMessage("Remember me", { apiKey: "" });

    const again = await getConversation();
    expect(again[0].content).toBe("Remember me");
  });

  it("can be cleared (2.7)", async () => {
    await sendHelperMessage("Something", { apiKey: "" });
    expect(await getConversation()).toHaveLength(2);

    await clearConversation();
    expect(await getConversation()).toHaveLength(0);
  });

  it("trims whitespace from the question", async () => {
    await sendHelperMessage("  padded  ", { apiKey: "" });

    const conversation = await getConversation();
    expect(conversation[0].content).toBe("padded");
  });
});

describe("the answer cache (T2.8, T2.9, 2.19 to 2.21)", () => {
  it("builds the same key for the same question", () => {
    const fingerprint = "abc123";
    const first = buildCacheKey("chat", "What should I write?", fingerprint);
    const second = buildCacheKey("chat", "What should I write?", fingerprint);

    expect(first).toBe(second);
  });

  it("ignores capitalisation and extra spaces", () => {
    const fingerprint = "abc123";
    const plain = buildCacheKey("chat", "What should I write?", fingerprint);
    const messy = buildCacheKey("chat", "  WHAT   should I WRITE?  ", fingerprint);

    expect(messy).toBe(plain);
  });

  it("builds different keys for different jobs", () => {
    const chat = buildCacheKey("chat", "Question", "abc");
    const tags = buildCacheKey("tags", "Question", "abc");

    expect(chat).not.toBe(tags);
  });

  it("fingerprints the same set of achievements consistently", async () => {
    const a = await createAchievement({
      title: "One",
      date: new Date("2025-01-01"),
      category: "School",
    });
    const b = await createAchievement({
      title: "Two",
      date: new Date("2025-01-02"),
      category: "Sports",
    });

    expect(fingerprintAchievements([a, b])).toBe(fingerprintAchievements([a, b]));
    // Order doesn't matter.
    expect(fingerprintAchievements([b, a])).toBe(fingerprintAchievements([a, b]));
  });

  it("changes the fingerprint when an achievement is edited (T2.9, 2.21)", async () => {
    const created = await createAchievement({
      title: "Original",
      date: new Date("2025-01-01"),
      category: "School",
    });

    const before = fingerprintAchievements([created]);

    const updated = await updateAchievement(created.id, {
      title: "Edited",
      date: new Date("2025-01-01"),
      category: "School",
    });

    expect(fingerprintAchievements([updated])).not.toBe(before);
  });

  it("changes the fingerprint when an achievement is added", async () => {
    const first = await createAchievement({
      title: "One",
      date: new Date("2025-01-01"),
      category: "School",
    });
    const before = fingerprintAchievements([first]);

    const second = await createAchievement({
      title: "Two",
      date: new Date("2025-01-02"),
      category: "Sports",
    });

    expect(fingerprintAchievements([first, second])).not.toBe(before);
  });

  it("serves a repeat question from cache without spending a prompt (T2.8, 2.19)", async () => {
    await createAchievement({
      title: "Science fair",
      date: new Date("2025-03-14"),
      category: "School",
    });

    // Seed the cache the way a successful API call would.
    const achievements = await listAchievements();
    const fingerprint = fingerprintAchievements(achievements);
    const key = buildCacheKey("chat", "What are my strengths?", fingerprint);
    await db.cachedAnswer.create({
      data: { cacheKey: key, job: "chat", answer: "A saved answer." },
    });

    // A key is set, so without the cache this would try to call the API.
    const { message } = await sendHelperMessage("What are my strengths?", {
      apiKey: "sk-ant-not-used-because-cached",
    });

    expect(message.content).toBe("A saved answer.");
    expect(message.isCached).toBe(true);
    expect((await getLimitStatus()).used).toBe(0);
  });

  it("labels a cached answer (2.20)", async () => {
    const achievements = await listAchievements();
    const key = buildCacheKey(
      "chat",
      "Repeat question",
      fingerprintAchievements(achievements),
    );
    await db.cachedAnswer.create({
      data: { cacheKey: key, job: "chat", answer: "From cache." },
    });

    const { message } = await sendHelperMessage("Repeat question", {
      apiKey: "sk-ant-not-used",
    });

    expect(message.isCached).toBe(true);
  });

  it("misses the cache after an achievement changes (2.21)", async () => {
    const created = await createAchievement({
      title: "Before",
      date: new Date("2025-01-01"),
      category: "School",
    });

    const key = buildCacheKey(
      "chat",
      "Tell me about my work",
      fingerprintAchievements(await listAchievements()),
    );
    await db.cachedAnswer.create({
      data: { cacheKey: key, job: "chat", answer: "Stale answer." },
    });

    await updateAchievement(created.id, {
      title: "After",
      date: new Date("2025-01-01"),
      category: "School",
    });

    // In MOCK mode so no API call: the point is that the stale answer is
    // NOT returned.
    const { message } = await sendHelperMessage("Tell me about my work", {
      apiKey: "",
    });

    expect(message.content).not.toBe("Stale answer.");
    expect(message.isCached).toBe(false);
  });

  it("can be cleared", async () => {
    await db.cachedAnswer.create({
      data: { cacheKey: "k", job: "chat", answer: "x" },
    });

    await clearAnswerCache();
    expect(await db.cachedAnswer.count()).toBe(0);
  });
});

describe("the limit applies to the helper (2.16)", () => {
  it("refuses once the allowance is used up, with a key set", async () => {
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }

    await expect(
      sendHelperMessage("One more please", { apiKey: "sk-ant-would-be-used" }),
    ).rejects.toThrow(/used all your prompts/i);
  });

  it("leaves no dangling question when the limit refuses one", async () => {
    // Found by looking at the rendered page: the question used to be saved
    // before the limit was checked, so every refusal left a message with no
    // reply sitting in the conversation.
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }

    const before = await getConversation();

    await expect(
      sendHelperMessage("This should not be saved", {
        apiKey: "sk-ant-would-be-used",
      }),
    ).rejects.toThrow();

    const after = await getConversation();
    expect(after).toHaveLength(before.length);
    expect(after.some((m) => m.content === "This should not be saved")).toBe(
      false,
    );
  });

  it("pairs every question with a reply", async () => {
    await sendHelperMessage("First", { apiKey: "" });
    await sendHelperMessage("Second", { apiKey: "" });

    const conversation = await getConversation();

    // Every user message must be followed by an assistant one.
    for (let i = 0; i < conversation.length; i += 2) {
      expect(conversation[i].role).toBe("user");
      expect(conversation[i + 1]?.role).toBe("assistant");
    }
  });

  it("still answers in MOCK mode when the allowance is gone (2.23)", async () => {
    for (let i = 0; i < 10; i++) {
      await recordPromptUsed("chat");
    }

    // No key means no API call, so the limit is irrelevant.
    const { message } = await sendHelperMessage("Still there?", { apiKey: "" });
    expect(message.isMock).toBe(true);
  });
});
