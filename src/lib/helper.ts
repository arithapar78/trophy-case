import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { listAchievements } from "@/lib/achievements";
import {
  requirePrompt,
  recordPromptUsed,
  getLimitStatus,
  PromptLimitError,
  type LimitStatus,
} from "@/lib/prompt-limit";
import {
  buildCacheKey,
  fingerprintAchievements,
  readCachedAnswer,
  writeCachedAnswer,
} from "@/lib/answer-cache";

// The AI helper. REQUIREMENTS-v2.md Feature 2.
//
// Every AI job in v2 goes through here, so the limit, the cache and MOCK mode
// are applied in one place rather than repeated per feature.
//
// Low-energy rules (E.1 to E.8): Haiku, the smallest max_tokens that works,
// only the achievements the job needs, cache repeats, and never call the API
// without a deliberate user action.

/** The model every AI job uses (rule E.1). */
export const HELPER_MODEL = "claude-haiku-4-5";

/** Small on purpose: chat replies are a paragraph or two (rule E.2). */
const MAX_TOKENS = 1024;

/** How many achievements to send as background (rule E.3). */
const MAX_CONTEXT_ACHIEVEMENTS = 20;

export const HELPER_JOB = "chat";

export type HelperMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isMock: boolean;
  isCached: boolean;
  createdAt: Date;
};

export type HelperReply = {
  message: HelperMessage;
  limit: LimitStatus;
};

/** Thrown when the Claude API call fails. */
export class HelperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HelperError";
  }
}

export { PromptLimitError };

const SYSTEM_PROMPT = `You are the Trophy Case helper. You help a student make sense of the achievements they have saved.

Rules:
- Be warm, plain and brief. Write for a 14-to-18-year-old.
- Two short paragraphs at most unless asked for more.
- Only refer to achievements the student actually has. Never invent one.
- If you have no achievements to work from, say so and suggest adding some.
- You are not a counsellor. Suggest, don't advise on health, money or safety.
- No markdown formatting. Plain sentences.`;

/** Turns achievements into the short text the model reads (rule E.3). */
function describeAchievements(
  achievements: Array<{
    title: string;
    date: Date;
    category: string;
    note: string | null;
  }>,
): string {
  if (achievements.length === 0) {
    return "The student has not saved any achievements yet.";
  }

  return achievements
    .map((a) => {
      const date = a.date.toISOString().slice(0, 10);
      const note = a.note ? ` — ${a.note}` : "";
      return `- "${a.title}" (${a.category}, ${date})${note}`;
    })
    .join("\n");
}

/** A sample reply for when there's no API key (criteria 2.22, 2.23). */
function mockReply(question: string, achievementCount: number): string {
  return [
    `Sample answer. No Claude API key is set, so this is an example rather than a real reply.`,
    ``,
    `You asked: "${question.trim().slice(0, 120)}"`,
    ``,
    achievementCount > 0
      ? `With a key set, I would read your ${achievementCount} saved achievement${achievementCount === 1 ? "" : "s"} and answer properly.`
      : `With a key set, I would read your achievements and answer properly. You have not saved any yet.`,
  ].join("\n");
}

/** The conversation so far, oldest first. */
export async function getConversation(): Promise<HelperMessage[]> {
  const rows = await db.helperMessage.findMany({
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    ...row,
    role: row.role === "user" ? "user" : "assistant",
  }));
}

/** Empties the conversation (criterion 2.7). */
export async function clearConversation(): Promise<void> {
  await db.helperMessage.deleteMany({});
}

async function saveMessage(
  role: "user" | "assistant",
  content: string,
  flags: { isMock?: boolean; isCached?: boolean } = {},
): Promise<HelperMessage> {
  const row = await db.helperMessage.create({
    data: {
      role,
      content,
      isMock: flags.isMock ?? false,
      isCached: flags.isCached ?? false,
    },
  });

  return { ...row, role };
}

/**
 * Sends a message to the helper and returns the reply.
 *
 * Order matters:
 *   1. cache hit  -> free, no prompt spent (2.19)
 *   2. MOCK mode  -> free, no API call     (2.23)
 *   3. limit check -> refuse before spending anything (2.16)
 *   4. API call
 *   5. record the prompt ONLY after success (2.17)
 */
export async function sendHelperMessage(
  question: string,
  options: { apiKey?: string } = {},
): Promise<HelperReply> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new HelperError("Type a message first.");
  }

  // Only the most recent achievements, not the whole history (rule E.3).
  const allAchievements = await listAchievements();
  const context = allAchievements.slice(0, MAX_CONTEXT_ACHIEVEMENTS);

  // 1. A cached answer costs nothing.
  const fingerprint = fingerprintAchievements(context);
  const cacheKey = buildCacheKey(HELPER_JOB, trimmed, fingerprint);
  const cached = await readCachedAnswer(cacheKey);

  if (cached) {
    await saveMessage("user", trimmed);
    const message = await saveMessage("assistant", cached, { isCached: true });
    return { message, limit: await getLimitStatus() };
  }

  // 2. No key: sample answers, no API call, no prompt spent.
  const apiKey = (options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) {
    await saveMessage("user", trimmed);
    const message = await saveMessage(
      "assistant",
      mockReply(trimmed, allAchievements.length),
      { isMock: true },
    );
    return { message, limit: await getLimitStatus() };
  }

  // 3. Check the limit BEFORE saving the question. Saving first would leave
  // a dangling question with no reply in the conversation every time the
  // limit refused one.
  await requirePrompt();

  const savedQuestion = await saveMessage("user", trimmed);

  // 4. Make the call.
  const client = new Anthropic({ apiKey });

  let answer: string;
  try {
    const response = await client.messages.create({
      model: HELPER_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `My achievements:\n${describeAchievements(context)}\n\nMy question: ${trimmed}`,
        },
      ],
    });

    answer = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!answer) {
      throw new HelperError("The helper didn't say anything. Please try again.");
    }
  } catch (error) {
    // A failed call must not cost a prompt (criterion 2.17), so nothing is
    // recorded here — recordPromptUsed is only reached on success.
    //
    // Take the question back out too, so a failure doesn't leave it sitting
    // in the conversation with no reply.
    await db.helperMessage.deleteMany({ where: { id: savedQuestion.id } });

    if (error instanceof Anthropic.AuthenticationError) {
      throw new HelperError(
        "That API key wasn't accepted. Check ANTHROPIC_API_KEY in your .env.local file.",
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new HelperError(
        "Too many requests right now. Wait a minute and try again.",
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new HelperError(
        "Couldn't reach Claude. Check your internet connection and try again.",
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new HelperError(
        `Claude returned an error (${error.status}). Please try again.`,
      );
    }
    if (error instanceof HelperError) {
      throw error;
    }
    throw new HelperError("Something went wrong. Please try again.");
  }

  // 5. It worked, so spend the prompt and save the answer for next time.
  const limit = await recordPromptUsed(HELPER_JOB);
  await writeCachedAnswer(cacheKey, HELPER_JOB, answer);

  const message = await saveMessage("assistant", answer);
  return { message, limit };
}
