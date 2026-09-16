# Rules for Claude Code on this project

Read this before doing anything in this repo.

## What this project is

Trophy Case — a local-only app where a student (or their parent) saves achievements to a timeline, and AI turns those achievements into college essay ideas. See [README.md](README.md) for the full picture and [REQUIREMENTS.md](REQUIREMENTS.md) for exactly what v1 includes.

The person you're working with is learning as they go. Optimize for *them understanding the code*, not for cleverness.

## The prime directive

**Don't add features that aren't in REQUIREMENTS.md.**

If you think something is missing or wrong, say so and ask — don't just build it. If you notice something genuinely broken while doing other work, mention it rather than silently fixing unrelated code. The "Future ideas" list in the README is a parking lot, not a to-do list.

## Tech stack — use these, don't swap them

- **Next.js with TypeScript, App Router** (`src/app/`, not `pages/`)
- **Tailwind CSS** for all styling — no CSS modules, no styled-components, no separate stylesheets
- **SQLite via Prisma** — the database is a local file
- **Local `/uploads` folder** for files — no S3, no cloud storage
- **Anthropic SDK** for the Claude API, with MOCK-mode fallback when there's no key
- **Vitest** for unit tests, **Playwright** for the end-to-end test

Don't introduce a new library without asking first. Every new dependency is one more thing the user has to understand.

## Keep it simple

- Plain, obvious code beats clever code. If there's a boring way that works, use it.
- No abstraction until there are at least three real uses for it. Duplicated code is cheaper than the wrong abstraction.
- No state management library. React's built-in state is enough for this app.
- No premature optimization. This app holds a few hundred rows at most.
- Small files with clear names. If a file is getting long, that's a hint the feature is doing too much.
- Comments explain *why*, not *what*. The code already says what it does.

## Coding style

- TypeScript everywhere. No `any` — if you're reaching for it, the types are telling you something.
- Descriptive names: `achievementsByCategory`, not `data2`.
- Validation lives in one shared place (`src/lib/validation.ts`) and is used by both the server and the forms, so the rules can't drift apart.
- Database access goes through `src/lib/db.ts` — never create a new `PrismaClient` elsewhere.
- API routes stay thin: parse input, call a function in `src/lib/`, return the result. Logic lives in `src/lib/` so it can be unit-tested without a browser.
- Secrets are read on the server only. Never expose the API key to client code, and never prefix it with `NEXT_PUBLIC_`.
- Handle errors where they happen and return a message a 14-year-old would understand.

## Explain changes in plain English

After every change, explain in a short paragraph:

- What you changed, in normal words — no jargon without a definition.
- Why it was needed.
- Exactly how to try it in the browser: which command to run, which URL to open, what to click, what should happen.

When something breaks, explain it like you're talking to a smart 14-year-old: what went wrong, why it happened, and what the fix does. Never just paste a stack trace and move on.

## Run the tests after every change

Non-negotiable. After every code change:

```bash
npm test
```

And before calling a feature done, also:

```bash
npm run build
```

If tests fail, fix them before moving on. **Never** report work as finished when tests are failing — say plainly that they're failing and show the output. Don't delete or skip a test to make the suite green; if a test is genuinely wrong, explain why and ask before changing it.

Every feature in REQUIREMENTS.md needs its listed tests written and passing before that feature counts as done.

## One feature at a time

Build features in the order listed in REQUIREMENTS.md. After each feature: run the tests, explain how to try it, make a git commit, and **wait for approval** before starting the next one. Don't run ahead.

## Git

- Commit after each finished step.
- Clear, plain commit messages that say what changed and why.
- Never commit `.env.local`, `/uploads`, `prisma/dev.db`, or `node_modules`.
- Don't commit unless the tests pass.

## Privacy

This app holds a child's personal data. Read [PRIVACY.md](PRIVACY.md) before changing anything about how data is stored, sent, or logged. Don't add analytics, tracking, crash reporting, or any third-party service that sees user data. The only outbound network call in v1 is the Claude API for essay ideas.
