# Rules for Claude Code on this project

Read this before doing anything in this repo. Then read [REQUIREMENTS.md](REQUIREMENTS.md).

## What this project is

Trophy Case: a phone-first app where a student (or a parent) photographs an achievement, saves it to a timeline, and later asks AI which achievements matter most for a goal. See [README.md](README.md) for the full picture and [REQUIREMENTS.md](REQUIREMENTS.md) for exactly what each phase includes.

**This is a fresh start.** An earlier version of this app lives in git history (a Next.js server with a SQLite file). None of that code is used. Do not copy it back. The ideas carried over; the code did not.

**Everything the user saves stays on their device.** No server database, no accounts, no photo bucket. The app is a static web page that runs on the phone and keeps its data in the phone's browser storage. The only thing that ever leaves the phone is what the user sends to the AI, and only when they turn AI on.

**It is built for a phone screen first.** Every screen and control has to work with a thumb on an iPhone before it works anywhere else.

The person you are working with is learning as they go. Optimise for them understanding the code, not for cleverness.

## The prime directive

**Build only what REQUIREMENTS.md says, in the order it says, one phase at a time.**

If something seems missing or wrong, say so and ask. Do not build it. If you notice something broken while doing other work, mention it rather than silently fixing unrelated code.

## Tech stack (decided, do not swap)

- **Vite + React + TypeScript**
- **Tailwind CSS** for all styling. No CSS modules, no styled-components, no separate stylesheets beyond the one Tailwind entry file
- **Dexie** over the browser's IndexedDB for all saved data, including photos
- **The browser's own file input** for the camera. No camera library
- **A service worker** (via `vite-plugin-pwa`) for offline use and Home Screen install
- **Vitest** for unit tests, **Playwright** for end-to-end tests at phone size
- **Anthropic SDK** for AI, running only inside a small serverless function that holds the key, with a MOCK mode when there is no key. Nothing else

Do not add a library without asking first. Every new dependency is one more thing the user has to understand.

## Keep it simple

- Plain, obvious code beats clever code
- No abstraction until there are at least three real uses for it
- No state management library. React's built-in state is enough
- No premature optimisation. This app holds a few hundred achievements at most
- Small files with clear names. A long file is a hint the feature is doing too much
- Comments explain why, not what

## Coding style

- TypeScript everywhere. No `any`
- Descriptive names: `achievementsByCategory`, not `data2`
- Validation lives in one place, `src/lib/validation.ts`, and is used by the forms and by import, so the rules cannot drift
- All database access goes through `src/lib/db.ts`. Never open Dexie anywhere else
- Logic lives in `src/lib/` so it can be unit-tested without a browser. Components stay thin: render, call a function in `src/lib/`, show the result
- Photo handling (resize, EXIF stripping) lives in `src/lib/photos.ts`
- Errors are handled where they happen and shown as a message a 14-year-old would understand

## The AI rules

- The API key is never in the app the phone downloads. It lives only in the serverless function's environment
- The app only calls the AI when the user has turned it on for that photo or in Settings. Never in the background
- Photos are resized to about 1024 px before they are sent
- With no key set, the function returns clearly labelled MOCK results, so development and tests never hit the real API
- The function stores nothing. It receives, calls the model, returns

## Explain changes in plain English

After every change, explain in a short paragraph:

- What you changed, in normal words. No jargon without a definition
- Why it was needed
- Exactly how to try it: which command to run, which URL to open, what to tap, what should happen

When something breaks, explain it like you are talking to a smart 14-year-old: what went wrong, why, and what the fix does. Never just paste a stack trace.

## Run the tests after every change

Non-negotiable. After every code change:

```bash
npm test
```

And before calling a feature done:

```bash
npm run build
npm run test:e2e
```

If tests fail, fix them before moving on. Never report work as finished when tests are failing. Never delete or skip a test to make the suite green; if a test is wrong, explain why and ask.

## Done means tried on a phone

A feature is not done until the user has opened it on their phone and tried it. After the tests pass, say plainly what to try on the phone and wait for the user to confirm.

## One phase at a time

Build phases in the order in REQUIREMENTS.md. After each phase: run the tests, explain how to try it, make a git commit, and wait for approval before starting the next one. Do not run ahead.

## Git

- Commit after each finished step, with a plain message that says what changed and why
- Never commit `.env.local`, `node_modules`, `dist`, or any photo or data file
- Do not commit unless the tests pass

## Privacy

This app holds a child's personal data. Read [PRIVACY.md](PRIVACY.md) before changing anything about how data is stored, sent, or logged. No analytics, no tracking, no crash reporting, no third-party service that sees user data. The AI function is the only outbound call, and only when the user turns AI on.
