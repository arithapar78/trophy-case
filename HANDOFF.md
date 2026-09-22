# Trophy Case: handoff for the next Claude chat

Read this first, then [CLAUDE.md](CLAUDE.md) (the rules), then [REQUIREMENTS.md](REQUIREMENTS.md) (the contract). This file says where the project stands, how it is built and deployed, what is half-done, and exactly what comes next. Last updated 2026-09-21.

## What it is, in one paragraph

Trophy Case is a phone-first web app. A student (13 to 18) or a parent photographs an achievement, saves it to a timeline, and AI tells them which achievements matter most for a goal (a college, a job) and what to do next. **Everything the user saves stays on their device** (IndexedDB via Dexie). There is no server database of achievements. The only server code is a handful of small Vercel functions that hold the AI key. The person building it (Ari) is learning as they go, with a parent (Vishal) helping: explain changes in plain English, one phase at a time, tests with every change, tried on a real phone before "done".

## Where things are

| Thing | Where |
|---|---|
| Code | `/Users/Ari/workplace/ari-workspace/projects/achievement-tracker` on the Mac, GitHub `arithapar78/trophy-case`, remote name `Trophy-Case`, branch `main` |
| Live site | https://trophy-case-trophy-case.vercel.app (Vercel project `trophy-case`, team `trophy-case`, connected to the GitHub repo; every push to `main` deploys; Deployment Protection is disabled so links work without a Vercel login) |
| Environment variables (Vercel) | `ANTHROPIC_API_KEY` set. Phase 5 needs `GOOGLE_CLIENT_ID` and the Upstash Redis variables (see below) |
| AI model | `claude-haiku-4-5` through the Anthropic SDK, server side only. MOCK mode when no key |
| Product portfolio | Claude doc "Trophy Case Product Portfolio" in the claude.ai project "Trophy Case - Project for Ari" |

## How to work on it

- Stack: Vite + React + TypeScript, Tailwind 4, Dexie, Vitest (Node + fake-indexeddb), Playwright (Chromium with an iPhone 14 viewport). Vercel functions in `api/`, their logic in `server/`. Do not add libraries without asking. Full list of what is installed: `package.json`.
- `npm test` (unit), `npm run build`, `npm run test:e2e` (builds, then tests the production build with `vite preview` on port 4173; the `api/` handlers are mounted into dev and preview servers by a plugin in `vite.config.ts`, MOCK unless `.env.local` has a key).
- One-time on a new machine: `npm install`, `npx playwright install chromium`.
- The Mac's `node_modules` is built for macOS. If you work from a Linux sandbox, use a separate copy of the repo and sync files back; never run `npm install` into the Mac's folder from Linux.
- Playwright in a sandbox with a pre-installed Chromium: `PW_CHROMIUM_PATH=/path/to/chromium npm run test:e2e`.
- Commit messages: plain English, what and why. Commit only when tests pass. Ari runs `git push Trophy-Case main` from the Mac (the sandbox has no GitHub credentials).

## Gotchas already learned (do not re-learn them)

1. **Vercel runs `api/*.ts` as plain Node ESM.** Every relative import in `api/` and `server/` (and any `src/lib` file they pull in) must spell out the `.js` extension (`'../server/http.js'`). Without it the function 500s before it runs. `vite.config.ts` imports the handlers with `.ts` extensions. Check a change by compiling like Node does: `npx tsc --ignoreConfig api/<file>.ts --outDir /tmp/out --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck --esModuleInterop --verbatimModuleSyntax --types node`, add `{"type":"module"}` to `/tmp/out/package.json`, and run the handler with a fake req/res.
2. **React runs effects twice in development.** The details sheet uses a ref guard so a photo is not added twice.
3. **Loading a value asynchronously into a form field can wipe fast typing.** The goal field takes its initial value as a prop from `App` for this reason.
4. **Playwright `getByText` on a paragraph with mixed children was unreliable.** Use `data-testid`.
5. **Photos:** resizing via canvas and re-encoding as JPEG is what strips EXIF (GPS, time). `prepareForStorage(file, maxSide, quality)` in `src/lib/photos.ts`; 1600 px for storage, 1024 px for the AI.
6. **iPhone:** the camera only opens over https; over plain http it offers the photo library. Home Wi-Fi often blocks phone-to-laptop; a Personal Hotspot with `npm run dev -- --host` works. The real test is the Vercel URL.
7. **Vercel Hobby is for non-commercial use.** Before charging money, the project needs Vercel Pro ($20/month) or another host.
8. **Do not put keys in chat or code.** They live in Vercel's Environment Variables (and a git-ignored `.env.local` locally). If one is ever exposed, rotate it in the Anthropic console.

## Phase status

| Phase | Status | Commit |
|---|---|---|
| 0. Restart, harness, empty app | Done | `adf19f5` |
| 1. Core on the device: capture (photo or manual), up to 5 photos, fields, timeline, search, filter, edit, delete, viewer | Done, phone-checked | `0abf0af` |
| 2. Install from a URL (PWA), offline, backup zip and restore, delete everything, storage meter | Done, phone-checked | `cee56a6`, Vercel hosting `43f4bd3` |
| 3. AI photo read, off by default, per-photo button plus Settings switch, MOCK mode, 10 per 5 h counted on the device | Done, phone-checked | `9adc340`, fix `4df0d83` |
| 4. Goal, Ranked view, recommendations, export as PDF (hand-built) and text | Done, phone-checked | `b05a89a` |
| 5. Accounts (identity only), server-side limit | Built and tested, **not yet pushed or phone-checked** | `82cdf4c` on `main` |
| 6. Pro plan, $10/month via Stripe, 100 uses per 5 h | Planned | |
| 7. Assistant (Pro only): chat and confirm-before-edit bulk edits | Planned | |
| 8. Extra categories (Volunteering, Work, Clubs, Awards) | Planned, needs Ari's yes | |
| 9. Store wrappers: Amazon Appstore, Apple App Store | Planned | |

Every phase gets a numbered section in REQUIREMENTS.md before the code (Phases 0 to 5 are there). Checkboxes are for Ari to tick on the phone.

## Phase 5: accounts. What is decided, done, and left

### Decisions (agreed with Ari, in chat)

- Accounts are **identity only**: user id, email, plan, created-at, and the timestamps of AI uses in the last 5 hours. Achievements and photos stay on the device. No sync yet (a later, separate decision; it would put children's data on a server and bring COPPA into play).
- **AI features require a sign-in** from this phase on (photo read, rank, recommend). Everything else works signed out. This stops strangers from running up the API bill through the public functions, and makes the limit follow the person, not the phone.
- Sign-in method: **Continue with Google** (no passwords, no email service, no domain needed). Magic links were rejected because Resend's free tier needs a paid domain. Apple sign-in later ($99/year).
- Server store: **Upstash Redis** through the Vercel Marketplace (free, connects to the project with no copying). In development and tests an in-memory store is used. On the live site with no Redis, accounts refuse to work rather than silently forgetting sign-ins.
- Free = 10 uses per rolling 5 hours, Pro = 100, counted on the server. The device no longer counts; it shows the numbers the server returns with every AI answer.
- Test-mode sign-in (any email, no Google) exists for local development and tests and is refused when `VERCEL_ENV === 'production'` or a Google client id is configured.

### What Ari must set up (told in chat, may or may not be done)

1. Upstash Redis: https://vercel.com/trophy-case/trophy-case/stores, Create Database, Upstash, connect to the project. It sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`/`KV_REST_API_TOKEN`) by itself.
2. Google OAuth client id: console.cloud.google.com, new project, OAuth consent screen (External, app name Trophy Case), Credentials, OAuth client ID, Web application. Authorized JavaScript origins: `https://trophy-case-trophy-case.vercel.app`, `http://localhost:5173`, `http://localhost:4173`. Also add `https://trophy-case-trophy-case.vercel.app/api/auth/google` under Authorized redirect URIs (the redirect sign-in flow posts there). Put the Client ID in Vercel as `GOOGLE_CLIENT_ID`. It is public, not a secret.

### Written so far (on branch `wip/phase-5-accounts`, build not yet green)

Server, complete and type-checked:
- `server/store.ts`: `Store` interface, `memoryStore()`, `redisStore(redis)` (keys `user:<id>`, `email:<email>`, `session:<token>` with 90-day expiry, `sessions:<id>`, `usage:<id>` with 5-hour expiry).
- `server/storeInstance.ts`: picks Redis when its env vars exist, else memory; `accountsReady()`, `isProduction()`, `setStoreForTests()`.
- `server/auth.ts`: `signIn(store, email)` (creates the user if new, returns a random session token), `authenticate(store, req)` from the `Authorization: Bearer` header, `verifyGoogleIdToken(idToken, clientId, fetch)` via Google's tokeninfo endpoint (checks `aud` and `email_verified`).
- `server/usage.ts`: `USES_PER_WINDOW = { free: 10, pro: 100 }`, `getUsageFor`, `useOne` (records a use if there is room).
- `server/aiRoute.ts`: `runAiRoute(req, res, work)`: 405 on non-POST, 401 `{code:'signin'}` when not signed in, 429 `{code:'limit', usage}` at the limit, otherwise runs the work and attaches `usage` to the answer. `api/read-photo.ts`, `api/rank.ts`, `api/recommend.ts` now go through it.
- `server/http.ts`: added `readRawBody`, `readFormBody`, `readCookie`, `redirect`.
- New routes: `api/config.ts` (GET: `googleClientId`, `devLogin`, `accountsReady`), `api/auth/google.ts` (POST: form post from Google's redirect flow with the `g_csrf_token` double-submit check, redirects to `/?session=<token>`; or JSON `{credential}` answering JSON), `api/auth/dev.ts` (POST `{email}`, test mode only), `api/auth/signout.ts`, `api/me.ts` (GET user + usage, DELETE account). All mounted in `vite.config.ts`.
- `src/lib/aiUsage.ts` rewritten: pure `windowStatus(times, limit, now)` and `formatWait`; the device counter and `localUsageStore` are gone. `tests/unit/aiUsage.test.ts` rewritten to match.

Client, partly done:
- `src/lib/account.ts`: token in localStorage (`trophy-case.session`), `useAccount()` hook (useSyncExternalStore), `refreshAccount`, `takeTokenFromUrl`, `signInWithGoogleCredential`, `signInTestMode`, `signOut`, `deleteAccount`, `fetchConfig`, `rememberUsage`, `authHeaders`.
- `src/lib/aiClient.ts`: `postAi(path, body)` shared by all AI calls: sends the token, remembers `usage`, throws `AiSignInRequiredError` on 401, `AiUnavailableError` otherwise. `src/lib/goalClient.ts` uses it.
- `src/components/AiPhotoPanel.tsx`: reads `useAccount()`; signed out shows "Sign in to use AI" with an `onOpenSettings` button; usage text comes from the server numbers. Props are now `{ state, onRun, onOpenSettings }`.
- `src/components/AchievementSheet.tsx`: takes `onOpenSettings`, no longer counts uses, auto-run only when signed in.
- `src/components/RankedView.tsx`: reads `useAccount()`; signed out shows a sign-in box (`data-testid="ranked-signin"`); limit text from server numbers.

### Finished (commit `82cdf4c` on `main`, version 2.4.0)

Everything listed above, plus the client half that was missing:

- `src/components/AccountSection.tsx` (new): the Account block at the top of Settings. Signed out it loads `/api/config` and shows the Google button (redirect mode, because a popup does not come back inside a Home Screen app), or the labelled test-mode email field when there is no client id, or a plain message when Redis is missing. Signed in it shows the email, the plan, "N of M AI uses left", Sign out, and Delete my account with a confirmation.
- `SettingsSheet.tsx`: renders `<AccountSection />` first; the old on-device usage meter is gone.
- `App.tsx`: on mount, `takeTokenFromUrl()` then `refreshAccount()`; passes `onOpenSettings` to the achievement sheet.
- README (Account section with the Google and Upstash setup steps), PRIVACY.md (the exact list of what the server stores, and the COPPA note rewritten now that an email is stored), `.env.example`.

Tests: **77 unit** (11 files) and **30 Playwright** at iPhone size, all passing three runs, plus `npm run build` clean and every `api/`/`server/` import checked for the `.js` extension rule.

- `tests/unit/accounts.test.ts` (new): T5.1 sessions and the Google token check, T5.2 the 10/100 limit and the 5-hour release, T5.3 the route guard (401 with no token, one use on success, none on a refusal, 405 on GET), T5.4 account deletion, plus the `devLoginAllowed()` guard.
- `tests/e2e/account.spec.ts` (new): T5.5 and T5.6 — signed out the panel asks for a sign-in and no AI request is made; the panel's button opens Settings and test-mode sign-in works there; signed in the count comes from the server and survives clearing the app's own storage; sign out and account deletion both keep the achievements.
- `tests/e2e/helpers/account.ts` (new): a unique email per test, so tests never share a usage count. `openFreshApp` now clears localStorage too.
- `ai.spec.ts` and `goal.spec.ts` sign in first; the old "at the limit" test that seeded localStorage now spends ten real uses against the server.

### Left to do for Phase 5

1. **Ari**: `npm install` on the Mac (Phase 5 added `@upstash/redis`), then `npm test` and `npm run test:e2e` to see them pass locally, then `git push Trophy-Case main`.
2. **Ari**: connect Upstash Redis in the Vercel project's Storage tab, and set `GOOGLE_CLIENT_ID` (both are written out in README.md). Until Redis is connected the live site refuses sign-in and says so; until the client id is set, the live Settings sheet says Google sign-in is not set up.
3. **Phone check** on https://trophy-case-trophy-case.vercel.app: Continue with Google, AI works, the count goes down, sign out keeps the achievements, sign-in survives closing and reopening the app.
4. Tick the Phase 5 checkboxes in REQUIREMENTS.md on the phone.
5. **CLAUDE.md is now out of date**: it still says "No server database, no accounts, no photo bucket". Achievements really do still stay on the device, but there is an account now. Agree the new wording with Ari and fix that line.

## Phase 6: Pro plan (planned)

- Stripe Checkout (subscription, $10/month) started from Settings when signed in; a webhook (`api/stripe/webhook.ts`) verifies the signature and sets `user.plan` to `pro` on `checkout.session.completed` / `customer.subscription.*`, back to `free` when cancelled. Store the Stripe customer id on the user. A "Manage subscription" link to Stripe's customer portal.
- Needs from Ari/Vishal: a Stripe account (an adult's legal name, address, bank), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, a Price id; Vercel Pro (Hobby is non-commercial); privacy policy and terms pages, read by a lawyer before charging parents.
- Tests: webhook signature rejected/accepted, plan flips, usage limit becomes 100.

## Phase 7: the assistant (Pro only, planned)

- A chat sheet. Text of the achievements plus the goal goes to a function (`api/assistant.ts`); the model answers questions, and for edit requests returns a **proposed change list** (which achievements, which fields, old and new values) that the app shows and applies to the device database only after the user taps Confirm. Never edits on its own. One AI use per message. Uses the same `runAiRoute` with a `plan === 'pro'` check.
- Drafting help: turn an achievement into a résumé bullet or a 150-character Common App activity line.

## Phases 8 and 9

- Categories: add Volunteering, Work, Clubs, Awards to `CATEGORIES` in `src/lib/types.ts` once Ari says yes; validation, filters and the AI prompts pick it up automatically; backup restore already accepts any listed category.
- Store wrappers: Amazon Appstore (free developer account) and Apple App Store ($99/year, needs a Mac build of a WebView wrapper, e.g. Capacitor, which would be a new library to ask about). Not started; the PWA is the product until then.

## Open questions still unanswered by Ari

Backup file-only (assumed yes); one goal at a time (assumed yes); extra categories; final name and domain; minimum age (assumed 13+).
