// The one model every AI feature uses. One place, so switching is one line.
//
// Phase 14 moved from claude-haiku-4-5 ($1 / $5 per million tokens in / out)
// to claude-haiku-5-5 ($0.10 / $0.50 for prompts under 100K tokens, which
// all of ours are): the same jobs for about a tenth of the price.
export const AI_MODEL = 'claude-haiku-5-5'
