# Trophy Case: handoff for the next Claude chat

Read this first, then [CLAUDE.md](CLAUDE.md) (the rules), then [REQUIREMENTS.md](REQUIREMENTS.md) (the contract). This file says where the project stands, how it is built and deployed, what is half-done, and exactly what comes next. Last updated 2026-09-23 (Phase 10).

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
8. **The Linux sandbox cannot delete anything in the Mac folder.** `rm` and git's own cleanup both fail with "Operation not permitted", which leaves `.git/*.lock` files behind and makes `git checkout`, `git merge` and `git reset` fail halfway. Working method: commit in the container, `git bundle` it across, `git fetch` the bundle, `git update-ref refs/heads/main <sha>`, then write every file from the commit across with `device_commit_files`. Move stale locks to `.git/tc-stale/` rather than trying to delete them. Ari should periodically `rm -rf .git/tc-stale _to_delete "Claude outputs"` on the Mac.
9. **Do not put keys in chat or code.** They live in Vercel's Environment Variables (and a git-ignored `.env.local` locally). If one is ever exposed, rotate it in the Anthropic console.

## Phase status

| Phase | Status | Commit |
|---|---|---|
| 0. Restart, harness, empty app | Done | `adf19f5` |
| 1. Core on the device: capture (photo or manual), up to 5 photos, fields, timeline, search, filter, edit, delete, viewer | Done, phone-checked | `0abf0af` |
| 2. Install from a URL (PWA), offline, backup zip and restore, delete everything, storage meter | Done, phone-checked | `cee56a6`, Vercel hosting `43f4bd3` |
| 3. AI photo read, off by default, per-photo button plus Settings switch, MOCK mode, 10 per 5 h counted on the device | Done, phone-checked | `9adc340`, fix `4df0d83` |
| 4. Goal, Ranked view, recommendations, export as PDF (hand-built) and text | Done, phone-checked | `b05a89a` |
| 5. Accounts (identity only), server-side limit | Done and live | `82cdf4c`, docs `23a0f3b` |
| 5b. Close buttons, design pass, Node 22 pin | Done | `1d1edfa`, `b129f2c`, `52f2370` |
| 6. Pro plan, $10/month via Stripe | Built and tested, **switched off in Phase 7**, not phone-checked, Stripe keys not set | `ad3d9f3` (requirements), `83ae645` (code) |
| 7. No AI limit, and Scout the goal chatbot | Pushed, **not phone-checked** | `522774d`, ranking fix `4fefbb3` |
| 8. Privacy policy page, 13+ age check | Pushed, Google sign-in being published, **not phone-checked** | `83ef870` |
| 9. Categories: broad starter list plus your own | Pushed, **not phone-checked** | `95ed9c0` |
| 10. The Me tab: AI summary, profile card, save as image, everything on one page | Built and tested, **not pushed, not phone-checked** | see Phase 10 below |
| 11. Scout suggests edits, confirm before anything changes, Undo | Requirements agreed | |
| Later. Store wrappers: Amazon Appstore, Apple App Store | Planned | |

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

## Phase 6: Pro plan. Built, waiting on Stripe keys and a phone check

Requirements agreed first and written into REQUIREMENTS.md (Features 12 and 13, tests T6.1 to T6.6) in commit `ad3d9f3`. Code in `83ae645`, version 2.5.0.

### Decisions

- **No Stripe library.** Stripe's API is ordinary form-encoded HTTPS, so `server/stripe.ts` is a small `fetch` wrapper and the signature check is Node's own `crypto` doing an HMAC. One less dependency for Ari to learn, and a smaller serverless function.
- **Stripe Checkout, hosted page, redirect mode.** No card details reach the app. A redirect, not a popup, for the same reason Google sign-in uses one: a popup does not come back inside a Home Screen app.
- **Only a signed message from Stripe changes a plan.** Nothing the app or a phone sends can. A bad, missing or stale signature changes nothing.
- **MOCK billing**, exactly like MOCK AI: with no Stripe keys and not in production, Settings offers a clearly labelled pretend upgrade. That is what the tests drive.
- `past_due` keeps an account on Pro, so a parent is not cut off mid-application while Stripe retries an expired card. `unpaid` and `canceled` drop to Free.

### What was written

- `server/stripe.ts`: `stripeConfig()` (all three keys or none), `stripeApi`, `createCheckoutSession`, `createPortalSession`, `verifyStripeSignature` (v1 scheme only, 5-minute tolerance, constant-time compare), `signPayload` for tests, `parseEvent`, `planChangeFromEvent`.
- `server/billing.ts`: `mockBillingAllowed()`, `findUserForChange`, `applyPlanChange`, `setPlanForTestingOrMock`.
- `server/store.ts`: `User` gains `stripeCustomerId` and `subscriptionStatus`; `Store` gains `getUserByStripeCustomer` and `markEventSeen` (atomic, via Redis `nx`, 7-day expiry). Redis keys `customer:<id>` and `event:<id>`; `deleteUser` clears the customer key too.
- `server/http.ts`: `readWebhookBody`, which prefers a Buffer or string body and refuses rather than re-stringifying a parsed one, because the signature covers the exact bytes.
- `api/stripe/checkout.ts` (401 without a sign-in, 200 with a Stripe URL or `mock: true`), `api/stripe/portal.ts`, `api/stripe/webhook.ts` (exports `config = { api: { bodyParser: false } }`). All three mounted in `vite.config.ts`.
- `api/config.ts` gains a `billing` block; `api/me.ts` reports `subscriptionStatus` and `canManage`.
- Client: `src/lib/account.ts` gains `startUpgrade`, `openSubscriptionPage`, `takeBillingResultFromUrl`, `clearBillingReturn`, `confirmUpgrade` (polls 6 times, 2 s apart, because Stripe returns the user before it tells our server). `src/components/PlanSection.tsx` is new and rendered by `AccountSection`. `App.tsx` handles the return from Stripe and opens Settings.

### Tests

**96 unit** (12 files) and **40 Playwright** at iPhone size, both passing twice in a row, build clean.

- `tests/unit/billing.test.ts` (18 tests): T6.1 signature accepted, wrong secret, tampered body, missing header, rubbish, stale timestamp, the fake `v0` scheme, the route's 400 and 405. T6.2 plan flips both ways, `past_due` versus `unpaid`, ignored event types, a one-off payment, an account that no longer exists. T6.3 repeat delivery. T6.4 100 on Pro and 10 on Free. T6.5 checkout needs a sign-in, and the pretend upgrade is refused when `VERCEL_ENV=production`.
- `tests/e2e/plan.spec.ts` (5 tests): T6.6 no offer signed out, upgrade raises the limit, the plan survives clearing the app, cancelling returns to Free with achievements untouched, and nothing but `/api/stripe/*` ever POSTs about a plan.
- **The signature check was mutation-tested:** making `verifyStripeSignature` always return true fails 4 tests. The test bites.
- The new handlers were compiled with `--module nodenext` and run as plain Node ESM with fake req/res, the way Vercel runs them. All four answered correctly. Gotcha 1 below stays clear.

### Left to do for Phase 6

1. **Ari**: `npm install` on the Mac (no new dependency, but the version moved), then `npm test` and `npm run test:e2e`, then `git push Trophy-Case main`.
2. **Vishal**: create the Stripe account and its sandbox, make the `Trophy Case Pro` $10/month price, and set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET` in Vercel. Steps are written out in README.md. Webhook endpoint: `https://trophy-case-trophy-case.vercel.app/api/stripe/webhook`, events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. **Phone check** on the live site: upgrade with test card `4242 4242 4242 4242`, Settings shows Pro and 100 uses, Manage subscription opens Stripe, cancelling returns to Free, achievements untouched throughout.
4. Tick the Phase 6 checkboxes in REQUIREMENTS.md on the phone.
5. **Before a real person pays:** activate the Stripe account, move Vercel off Hobby, publish terms and a privacy policy read by a lawyer. Written as 6.a to 6.c in REQUIREMENTS.md.

## Phase 7: no AI limit, and Scout. Built, needs push and phone check

Commit `522774d`, version 2.6.0. Requirements are Features 14 to 16 and tests T7.1 to T7.8 in REQUIREMENTS.md.

### Decisions (Vishal, in chat)

- **The visible limit is gone.** A counter that runs out reads as a paywall and sends away people who have not seen the app work yet. No use count appears anywhere.
- **A ceiling still exists, invisibly.** `OPEN_CEILING = 300` per rolling 5 hours in `server/usage.ts`, the same for every plan. It is a circuit breaker, not a product limit: the AI functions are reachable by anyone with a browser, and without a ceiling one script could run up the whole Anthropic bill. Vishal chose this over truly unlimited. **A spending cap in the Anthropic console is still the second net and should be set.**
- **Selling is switched off, not deleted.** `proEnabled()` in `server/billing.ts` reads `ENABLE_PRO`. Off, `api/config` reports billing unavailable and `PlanSection` renders nothing. Every line of Phase 6 still works and is still tested.
- **The chatbot is called Scout** (Vishal picked it from Casey / Coach / Curator / Scout).
- **An attached file is read, then offered**: if Scout finds an achievement in it, the app shows a card with a Save button. Nothing is saved until that is tapped.

### What was written

- `server/scout.ts`: the system prompt (goal, every achievement's words, today's date, instructions to stay on subject and never claim to have saved anything), `buildTurns` (history plus this message and its one file, as image / document / text blocks), `parseScoutReply` (splits the answer from a `<save>{...}</save>` block, dropping a malformed or future-dated one), `attachmentProblem`, and MOCK mode. Model is `claude-haiku-4-5`, same as everything else.
- `api/scout.ts` through the existing `runAiRoute`, so the sign-in and ceiling rules are shared. Mounted in `vite.config.ts`.
- `src/lib/scout.ts`: the saved conversation (Dexie v3 `scoutMessages`), `prepareAttachment` (pictures shrunk to 1024 px and re-encoded, which strips EXIF; PDFs and text passed through, all capped at about 3 MB), `checkAttachmentFile`, `toHistory` (last 12 turns, so a long chat does not keep getting dearer), `pendingProposal` / `resolveProposal`.
- `src/components/ScoutView.tsx`: the third tab. Message list, composer with the browser's own file input (`accept` set so an iPhone offers Photo Library, Take Photo and Browse), the Save / No thanks card, and Clear this conversation with a confirmation.
- Counters removed from `AccountSection`, `AiPhotoPanel` and `RankedView`. At the ceiling the wording is "The AI is resting for a moment, back in ..." and never mentions paying.

### Tests

**125 unit** (29 new) and **50 Playwright** (13 new), both passing twice, build clean.

- `tests/unit/scout.test.ts`: T7.1 the ceiling, T7.2 the `ENABLE_PRO` switch (including that the pretend upgrade is still refused in production), T7.3 what goes into the prompt and that no saved photo travels, T7.4 MOCK, parsing, and six kinds of malformed offer, T7.5 which files are accepted and that an oversized one never reaches the model.
- `tests/e2e/scout.spec.ts`: the tab, a message and its answer, the conversation surviving a reload, clearing it, signed-out behaviour, the empty timeline, attaching and removing a file, the offer not being saved until Save, saving it, and a refused file type.
- **Playwright now has two projects.** `iphone` tests the app as it ships; `iphone-pro` runs `plan.spec.ts` against a second preview server started with `ENABLE_PRO=1` (its own `dist-pro` folder, so the two builds never race). Phase 6 lost no coverage.
- Existing tests that asserted "10 of 10 AI uses left" now assert against `USES_PER_WINDOW`, so they stay true whatever the ceiling is. Nothing was deleted or skipped.
- **A real bug was caught by an e2e test:** the proposal card lived in React state, so switching to the Timeline tab and back lost the offer. It is now stored with the conversation.
- **A real Vercel bug was caught by the Node compile check, not the tests:** `src/lib/types.ts` imported `./aiTypes` without the `.js` extension, and the server pulls that file in. That is gotcha 1 and it would have been a 500 on the live site. Always run that check after touching anything under `src/lib` that the server imports.

### Left to do for Phase 7

1. **Ari**: `npm install`, `npm test`, `npm run test:e2e`, `git checkout -- package-lock.json` if npm install changed it, then `git push Trophy-Case main`.
2. **Phone check**: the Scout tab, sending a message, attaching a photo from the photo library and a PDF from Files, the Save card, clearing the conversation, and that no use counter appears anywhere.
3. **Vishal**: set a monthly spending cap in the Anthropic console. The ceiling protects against a runaway script; the cap protects against everything else.
4. Tick the Phase 7 checkboxes in REQUIREMENTS.md on the phone.

## Phase 8: privacy page and age check. Built, needs push and phone check

Commit `83ef870`, version 2.7.0. Requirements are Features 17 and 18, tests T8.1 to T8.4.

- `privacy.html` at the repo root is a second Vite page (`build.rollupOptions.input` in `vite.config.ts`), plain HTML styled by `src/index.css`, precached so it opens offline. Contact: ariquery@gmail.com (Vishal's choice). **Keep it and PRIVACY.md saying the same thing.**
- `src/lib/ageGate.ts` + `src/components/AgeCheck.tsx`: birth month and year, asked before any sign-in button, only when signed out. Neutral wording (Vishal agreed, following FTC guidance, instead of a 13+ checkbox). Counts as 13 from the start of the birth month. The date is dropped; localStorage keeps `trophy-case.age-check` = `passed` / `under13`. Under 13 blocks sign-in only.
- `src/components/PrivacyLink.tsx`: opens in a new tab, because a Home Screen app has no back button.
- 138 unit, 55 e2e, both green twice.

Left: Ari pushes; phone check (Settings while signed out shows the age question; privacy link opens; after passing, Google button appears); then Vishal publishes the Google project (README, "Opening Google sign-in to everyone"). Caveat: Google's Branding page wants the home page and privacy links on an authorized domain; a `*.vercel.app` address may or may not be accepted there, and a custom domain removes the question.

## Phase 9: categories. Built, needs push and phone check

Version 2.8.0. Requirements are Features 19 and 20, tests T9.1 to T9.6.

- `STARTER_CATEGORIES` in `src/lib/types.ts` (School, Sports, Arts, Community Service, Work, Clubs & Leadership, Awards, Other; Other always last and undeletable). `Category` is now just `string`; the old fixed `CATEGORIES` is gone.
- The user's own live in the settings table under `customCategories` (max 20, 1 to 30 characters, no repeats ignoring capitals, "All" refused). All rules are in `src/lib/validation.ts` (`validateCategoryName`, `cleanCustomCategories`, `fullCategoryList`, `categoryListFromRequest`, `categoryOrFallback`). `validateAchievement` takes the list as a 4th argument, defaulting to the starter list.
- `src/lib/categories.ts`: get, add, rename (moves achievements, one transaction), delete (moves to Other), `categoriesInUse` for the filter row, `ensureCategories` for restore.
- Dexie v4 upgrade turns any in-use category not on the starter list (Debate, Cooking) into a custom one. Nothing changes category.
- Backup format 3 carries `customCategories`; restore adds missing ones and puts anything that cannot be added into Other. Old format 1 and 2 backups still restore.
- Photo read and Scout send `categories`; the server checks the list and falls back to the starter list; any answer off the list becomes Other. **`validation.ts` is now imported by the server, so its imports use `.js` (gotcha 1). Checked with the Node ESM compile.**
- UI: `CategoryPicker.tsx` (chips now wrap so "+ New category" is always visible), `CategoriesSection.tsx` in Settings (add, rename, delete with a count), filter row shows only categories in use.
- Existing tests that used Debate or Cooking as a category now use Clubs & Leadership / Community Service, and the Scout "Nonsense category drops the offer" case became "falls back to Other", because the requirement changed. Nothing deleted or skipped.
- 160 unit, 59 e2e.
- Noticed, not fixed: the Settings AI section still says "each use is counted against your account. The count is in the Account section", which Phase 7 made untrue.

## Phase 10: the Me tab. Built, needs push and phone check

Version 2.9.0. Requirements are Feature 21 (21.8 and 21.9 added when Vishal chose "a visual card + save as picture"), tests T10.1 to T10.5.

- `server/summary.ts` + `api/summary.ts` (through `runAiRoute`, so sign-in and the ceiling apply). Achievements are numbered in the prompt and strengths point back by number, like the ranking fix. A malformed answer is refused, never shown. MOCK with no key. `realCallText` is now exported from `server/goalAdvice.ts` and shared.
- `src/lib/profile.ts`: saved summary in settings key `profileSummary` (with writtenAt, goal and the ids it was written from), `changesSince` / `describeChanges` for the "2 added since" note, `groupByCategory`, `profileTotals`, `categoryBars` (top 6, rest folded into "N more").
- `src/lib/profileCard.ts`: draws a 1080x1350 PNG with the browser canvas, no library. `wrapLines` is pure and unit-tested. The picture is handed to `shareOrDownload`.
- `src/components/MeView.tsx`: the fourth tab. Card (header, totals, summary, strengths with the achievements that show them, category chart, Write/Refresh or Sign in, Save as image), then every achievement grouped by category; tapping one opens it.
- The stale Settings sentence about counting AI uses is fixed.
- Not in backups: the summary. It can be rewritten with one tap; say if it should travel.
- 179 unit, 63 e2e, both passing twice.

## Phase 11 (agreed 2026-09-23)

- **11 Scout edits:** a `<changes>` block of proposed field changes referring to achievements by prompt number (not id; see the ranking fix), a confirm card with per-change ticks, Undo, max 50, validation, skip if edited since.
- **Later:** store wrappers (Apple needs Capacitor, a new library to ask about). Drafting help (résumé bullet, Common App line) was in the old plan; not asked for this time.

## Open questions still unanswered by Ari

Backup file-only (assumed yes); one goal at a time (assumed yes); extra categories; final name and domain; minimum age (assumed 13+).
