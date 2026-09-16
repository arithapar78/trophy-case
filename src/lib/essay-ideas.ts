import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Achievement } from "@/lib/achievements";

// The "Give me 3 college essay ideas" feature. REQUIREMENTS.md Feature 4.
//
// Only the TEXT of achievements is sent to Claude — never the uploaded photos
// or PDFs. With no API key set, MOCK mode returns clearly-labelled samples and
// makes no network call at all. See PRIVACY.md.

const IDEA_COUNT = 3;

/** One essay idea, as returned to the browser. */
export type EssayIdea = {
  title: string;
  hook: string;
  /** Titles of the achievements this idea draws on. */
  achievements: string[];
};

export type EssayIdeasResult = {
  ideas: EssayIdea[];
  /** True when these are samples because no API key is set (4.10). */
  isMock: boolean;
};

/** Thrown when there's nothing to generate ideas from (4.11). */
export class NoAchievementsError extends Error {
  constructor() {
    super("Add a few achievements first, then I can suggest essay ideas.");
    this.name = "NoAchievementsError";
  }
}

/** Thrown when the Claude API call fails (4.12). */
export class EssayIdeasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EssayIdeasError";
  }
}

// The shape we require back from the model. Using a schema means the response
// is validated for us rather than hoping it returns usable JSON.
const ideasSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string(),
        hook: z.string(),
        achievements: z.array(z.string()),
      }),
    )
    .length(IDEA_COUNT),
});

const SYSTEM_PROMPT = `You help a high school student find college essay ideas in their own achievements.

Rules:
- Return exactly ${IDEA_COUNT} ideas.
- Each idea needs a short title, a one-sentence hook, and the achievements it draws on.
- The "achievements" list must quote achievement titles EXACTLY as given. Never invent one.
- Look for a thread connecting several achievements rather than just retelling one.
- Small, ordinary achievements often make better essays than impressive ones. Prefer specific detail over grand claims.
- Write for a 17-year-old: plain, warm, no jargon or cliché.`;

/** Turns achievements into the compact text the model reads. */
function describeAchievements(achievements: Achievement[]): string {
  return achievements
    .map((achievement) => {
      const date = achievement.date.toISOString().slice(0, 10);
      const note = achievement.note ? `\n  Note: ${achievement.note}` : "";
      return `- "${achievement.title}" (${achievement.category}, ${date})${note}`;
    })
    .join("\n");
}

/**
 * Sample ideas for when there's no API key.
 *
 * These reference real achievements from the timeline, so the feature still
 * demonstrates what it does (4.9). They're deliberately generic in wording so
 * nobody mistakes them for real AI output.
 */
function mockIdeas(achievements: Achievement[]): EssayIdea[] {
  const titles = achievements.map((a) => a.title);
  const pick = (start: number, count: number) =>
    titles.slice(start, start + count).length > 0
      ? titles.slice(start, start + count)
      : titles.slice(0, 1);

  return [
    {
      title: "The thread you didn't notice",
      hook: "Sample idea: several of your achievements point at the same quiet habit — showing up again after something didn't work.",
      achievements: pick(0, 2),
    },
    {
      title: "Small things, done carefully",
      hook: "Sample idea: an essay about an ordinary moment you took seriously, and what that says about how you work.",
      achievements: pick(2, 2),
    },
    {
      title: "Who you did it for",
      hook: "Sample idea: the achievements where someone else benefited say more about you than the ones with trophies.",
      achievements: pick(4, 2),
    },
  ];
}

/**
 * Generates three college essay ideas from a student's achievements.
 *
 * Falls back to MOCK mode when ANTHROPIC_API_KEY is missing or blank, so the
 * app works without a key.
 */
export async function generateEssayIdeas(
  achievements: Achievement[],
  options: { apiKey?: string } = {},
): Promise<EssayIdeasResult> {
  if (achievements.length === 0) {
    throw new NoAchievementsError();
  }

  const apiKey = (options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "").trim();

  // No key: return samples without touching the network (4.9, 4.10).
  if (!apiKey) {
    return { ideas: mockIdeas(achievements), isMock: true };
  }

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.parse({
      // Haiku is the smallest, lowest-energy Claude model. Three short ideas
      // fit easily in 1000 tokens, so we cap it there to avoid waste.
      model: "claude-haiku-4-5",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are my achievements:\n\n${describeAchievements(achievements)}\n\nGive me ${IDEA_COUNT} college essay ideas.`,
        },
      ],
      output_config: { format: zodOutputFormat(ideasSchema) },
    });
  } catch (error) {
    // Turn SDK errors into something a student can act on (4.12).
    if (error instanceof Anthropic.AuthenticationError) {
      throw new EssayIdeasError(
        "That API key wasn't accepted. Check ANTHROPIC_API_KEY in your .env.local file.",
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new EssayIdeasError(
        "Too many requests right now. Wait a minute and try again.",
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new EssayIdeasError(
        "Couldn't reach Claude. Check your internet connection and try again.",
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new EssayIdeasError(
        `Claude returned an error (${error.status}). Please try again.`,
      );
    }
    throw new EssayIdeasError("Something went wrong. Please try again.");
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new EssayIdeasError(
      "Claude's answer wasn't in the expected shape. Please try again.",
    );
  }

  // Trust but verify: drop any achievement title the model invented (4.7).
  const knownTitles = new Set(achievements.map((a) => a.title));
  const ideas = parsed.ideas.map((idea) => ({
    title: idea.title,
    hook: idea.hook,
    achievements: idea.achievements.filter((title) => knownTitles.has(title)),
  }));

  return { ideas, isMock: false };
}
