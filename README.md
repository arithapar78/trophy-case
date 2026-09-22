# Trophy Case

Snap a photo. Save the win. Build your timeline. Everything stays on your phone.

A phone-first app for recording achievements the moment they happen, a medal, a certificate, a finished project, so that years later you still have the whole record instead of the three things you happen to remember. Later, AI tells you which ones matter most for the college or job you are aiming at.

## The problem it solves

By the time a student sits down to write college applications, they have to remember years of activities, awards and projects. Most of it is gone: the certificate went in a drawer, the photo is buried in a camera roll, the trophy is in a box somewhere.

Trophy Case makes saving an achievement take under 10 seconds: point the camera at the thing, type a title, tap a category, done.

## Who it is for

- **Students**, roughly 13 to 18, building a record for college or job applications
- **Parents** capturing a younger kid's wins before they are forgotten

## The one rule

**Your data stays on your device.** There is no account and no server holding your achievements. The app is a web page your phone downloads once and then runs by itself, keeping everything in the phone's own storage. The only thing that ever leaves the phone is what you choose to send to the AI, and AI is off until you turn it on.

## What it will do, phase by phase

This is a fresh build. Each phase below is built, tested and tried on a phone before the next one starts. The full contract is in [REQUIREMENTS.md](REQUIREMENTS.md).

| Phase | What you get |
|---|---|
| 0. Restart (done) | Empty app, tests wired up, this harness |
| 1. The core (done) | Take a photo or write it down, up to 5 photos, timeline, search, filter, edit, delete. All on the device |
| 2. On your phone (done) | A real URL, Add to Home Screen, works offline, backup to a file and restore, delete everything |
| 3. AI photo read (done) | AI drafts the title from the photo. Off by default, a button each time to turn it on. 10 uses per 5 hours |
| 4. Goal and ranking (done) | Set a goal, see which achievements matter most and what to do next. Export as PDF or text |
| 5. Accounts (done) | Sign in with Google. The AI limit follows you, not the phone. Achievements still never leave the device |
| 6. Pro plan (built, switched off) | $10 a month through Stripe. All there and tested, but nothing is for sale until there are users |
| 7. Scout (done) | A chat that knows your goal and your record, with file upload. No AI limit to worry about |
| Later | Extra categories, app store listings |

## Tech stack

| Piece | What we use | Why |
|---|---|---|
| App | Vite + React + TypeScript | Builds a static page that runs entirely on the phone |
| Hosting | Vercel (free) | Serves the built files over https and runs the AI function later |
| Styling | Tailwind CSS | Style directly in the markup, no separate stylesheets |
| Storage | Dexie (over the browser's IndexedDB) | The phone's built-in database. Photos included. Nothing leaves the device |
| Camera | The browser's own file input | The phone does the work, no camera library |
| Offline and install | A service worker (vite-plugin-pwa) | Opens with no signal, installs to the Home Screen |
| Backup | fflate (a tiny zip library) | One zip file with your achievements and photos |
| AI | Anthropic SDK (Claude Haiku 4.5) inside three small Vercel functions in `api/` | The key stays on the server side, never in the app. MOCK mode when there is no key |
| PDF export | Written by hand in `src/lib/pdf.ts`, no library | A text-only PDF is simple enough to build directly |
| Unit tests | Vitest | Fast tests for the logic |
| Browser tests | Playwright | Drives a real browser at iPhone size |

## Install and run it

Assume you have never done this before. Follow these in order.

### Step 0: What you need

**Node.js 20 or newer.** In Terminal:

```bash
node --version
```

If you see `v20` or higher, you are good. Otherwise install the LTS version from https://nodejs.org, then close and reopen Terminal.

### Step 1: Go to the project folder

```bash
cd /Users/Ari/workplace/ari-workspace/projects/achievement-tracker
```

### Step 2: Install the building blocks

```bash
npm install
```

Downloads every library the project needs into `node_modules`. A minute or two, once.

### Step 3: Start the app

```bash
npm run dev
```

Open **http://localhost:5173**. The app runs while that Terminal window is open. `Ctrl + C` stops it.

### Opening it on your phone (during development)

1. Phone and Mac on the **same Wi-Fi**.
2. Find the Mac's address: `ipconfig getifaddr en0` (prints something like `192.168.1.42`).
3. Start the app so other devices can reach it: `npm run dev -- --host`
4. On the phone, open `http://192.168.1.42:5173`.

Over plain `http://` the camera button opens the photo library instead of the live camera, because browsers only allow the camera on a secure address. Everything else works the same. The real camera arrives with the https URL in Phase 2.

## The live site (Vercel)

The app is hosted on Vercel. Every push to `main` on GitHub builds it (the unit
tests run first) and publishes it at a real https address, so the phone camera
and Add to Home Screen both work. Vercel only serves the code; what you save
stays on your phone.

One-time setup:

1. Go to https://vercel.com and choose **Continue with GitHub**.
2. **Add New** then **Project**, pick the `trophy-case` repo, and click **Deploy**.
   The defaults are right; `vercel.json` in this repo tells Vercel what to run.
3. Vercel shows the address when it finishes, something like
   `https://trophy-case.vercel.app`. That's the app.

After that, publishing is just:

```bash
git push Trophy-Case main
```

The same Vercel project also runs the small AI functions in `api/`: one reads a
photo, one ranks achievements against the goal, one suggests what to do next.

### Accounts and the AI limit (Phase 5)

The AI features need a sign-in. Everything else, saving, editing, backup and
export, works signed out. The server keeps only who you are: a user id, your
email, your plan, when the account was made, your sign-in tokens, and the times
of your AI uses in the last 5 hours. Your achievements never leave the device.

Two one-time setup jobs in Vercel:

1. **The database for accounts.** Vercel project, **Storage**, **Create
   Database**, choose **Upstash for Redis**, connect it to the project. It adds
   its own settings (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`);
   nothing needs copying by hand. Without it, the live site says accounts are
   not set up and sign-in is refused rather than silently forgetting people.
2. **Google sign-in.** At https://console.cloud.google.com make a project, fill
   in the OAuth consent screen (External, app name Trophy Case), then
   **Credentials**, **Create Credentials**, **OAuth client ID**, **Web
   application**. Authorized JavaScript origins: the live site address,
   `http://localhost:5173` and `http://localhost:4173`. Authorized redirect
   URIs: the live site address plus `/api/auth/google`. Copy the Client ID into
   Vercel as `GOOGLE_CLIENT_ID`. It is public, not a secret.

Locally, with no `GOOGLE_CLIENT_ID` set, Settings shows a clearly labelled
test-mode sign-in that takes any email. It is refused on the live site.

### Scout, and why there is no AI limit (Phase 7)

**Scout** is the third tab. It is a chat that already knows the goal and
every achievement, so a student can ask "what should I put first" in their
own words. It runs on Claude Haiku like the rest of the app, needs a
sign-in, and answers in MOCK mode with no key. The conversation is kept on
the device. A file can be attached to any message: pictures, PDFs and plain
text, from the phone's photo library or a computer's file picker. The file
is sent with that one message and stored nowhere. If Scout spots an
achievement in it, it offers a card with a Save button; nothing is saved
until that is tapped.

**There is no AI limit shown anywhere.** A counter that runs out reads as a
paywall, and a paywall in front of someone who has not seen the app work
sends them away. The server still counts against a ceiling high enough that
no real person reaches it (`OPEN_CEILING` in `server/usage.ts`), because the
AI functions are reachable by anyone with a browser and without some ceiling
one script could run up the whole Anthropic bill. Set a spending cap in the
Anthropic console as well.

**Selling is switched off.** Every line of the Phase 6 Stripe code is still
there and still tested; `ENABLE_PRO=1` on the server brings the offer back
with no code change. The end-to-end tests cover both states: the `iphone`
project tests the app as it ships, and `iphone-pro` runs the upgrade flow
against a second preview server started with `ENABLE_PRO=1`.

### The Pro plan (Phase 6, switched off)

Paying is handled by Stripe Checkout, so no card details ever reach this app.
Upgrading asks our server for an address on Stripe's own payment page and
sends the browser there. When the payment goes through, Stripe posts a signed
message to `/api/stripe/webhook`, and that message is the only thing in the
whole app allowed to move an account between Free and Pro.

Setting it up, once, by an adult (Stripe needs a real legal identity):

1. Make an account at https://dashboard.stripe.com/register. You do **not**
   need to activate it for live payments yet. A new account comes with a
   sandbox, which is a practice mode with fake cards and no real money.
2. In the sandbox, **Product catalog**, add a product, `Trophy Case Pro`,
   $10 USD, recurring monthly. Copy the **Price ID** (`price_...`).
3. **API keys**, copy the **secret key** (`sk_test_...` in the sandbox).
4. **Webhooks**, create an endpoint at `<the live site>/api/stripe/webhook`
   listening for `checkout.session.completed`,
   `customer.subscription.updated` and `customer.subscription.deleted`.
   Reveal and copy the **signing secret** (`whsec_...`).
5. Put all three into Vercel as `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and
   `STRIPE_WEBHOOK_SECRET`. Never paste them into chat or into code.

Test with Stripe's card `4242 4242 4242 4242`, any future expiry, any CVC.

Locally, with none of the three set, Settings offers a clearly labelled
pretend upgrade that flips the plan with no payment, which is what the tests
use. It is refused on the live site.

**Before charging a real person:** activate the Stripe account (bank, legal
name, tax details), move Vercel off the Hobby plan (it is for non-commercial
use only), and publish terms and a privacy policy that a lawyer has read. The
customers would be parents and the users are minors.

### The AI key

The AI reads photos through Claude Haiku. The key lives in Vercel only:
project, **Settings**, **Environment Variables**, name `ANTHROPIC_API_KEY`,
paste the key, Save. Without it the AI answers in MOCK mode with a labelled
sample, so everything still works. Set a monthly spending limit in the
Anthropic console too.

For local development, put the same line in `.env.local` (git-ignored). Leave
it out and the local server answers in MOCK mode.

## How to run the tests

**Unit tests** (fast, check the logic):

```bash
npm test
```

**Browser tests** (a real browser at phone size, against a production build):

```bash
npx playwright install chromium   # one time only, downloads the test browser
npm run test:e2e
```

These build the app first and test the built files, the same ones Vercel
serves, so offline mode and the Home Screen install are tested for real.

**Build check** (catches TypeScript errors):

```bash
npm run build
```

## All the npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app at http://localhost:5173 |
| `npm run build` | Builds the production version into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the unit tests once |
| `npm run test:watch` | Re-runs unit tests as you edit |
| `npm run test:e2e` | Runs the Playwright browser tests |

## Folder structure

```
achievement-tracker/
├── README.md              You are here
├── REQUIREMENTS.md        The contract: every phase, numbered, testable
├── CLAUDE.md              Rules for Claude Code on this project
├── PRIVACY.md             How we keep a kid's data safe
├── .env.example           Template for settings (safe to commit)
├── vercel.json            Tells Vercel how to build
├── api/                   The server functions: hold the key, ask the AI, store no achievements
│   ├── read-photo.ts      A photo in, a draft out
│   ├── rank.ts            Goal + achievements in, ranks with reasons out
│   ├── recommend.ts       Goal + achievements in, three next steps out
│   ├── config.ts          What the app needs to know before signing in
│   ├── me.ts              Who is signed in; also deletes the account
│   └── auth/              google.ts, dev.ts (test mode), signout.ts
├── server/
│   ├── photoRead.ts       What read-photo does, testable without a server
│   ├── goalAdvice.ts      What rank and recommend do
│   ├── store.ts           The account records: memory for tests, Redis live
│   ├── storeInstance.ts   Which of those two this server is using
│   ├── auth.ts            Signing in, checking a token, checking Google's
│   ├── usage.ts           The AI limit, counted on the server
│   └── aiRoute.ts         The sign-in and limit check every AI function runs
├── index.html             The one HTML page
├── vite.config.ts         Build settings (Vite + Tailwind)
├── vitest.config.ts       Unit test settings
├── playwright.config.ts   Browser test settings (iPhone size)
├── public/
│   └── icon.svg           The trophy icon
├── src/
│   ├── main.tsx           Starts the app
│   ├── App.tsx            The top-level screen
│   ├── index.css          Tailwind entry and the app's colours
│   ├── components/        The screens: sheet, cards, filters, settings, viewer
│   ├── hooks/             Small React helpers
│   └── lib/               Logic with no screen in it, so it can be unit-tested
│       ├── db.ts            The one database connection (Dexie)
│       ├── achievements.ts  Create, edit, delete, list
│       ├── validation.ts    The rules for a valid achievement
│       ├── photos.ts        Checking, resizing and EXIF stripping
│       ├── backup.ts        Backup zip in and out
│       ├── aiClient.ts      Sends a small copy of a photo to the function
│       ├── account.ts       Who is signed in on this device
│       ├── aiUsage.ts       The shape of the 10-per-5-hours window
│       ├── aiSettings.ts    The "always let AI read my photos" switch
│       ├── goal.ts          The goal, rankings and recommendations, stored on the device
│       ├── goalClient.ts    Sends the goal and the achievements' text to the functions
│       ├── exportText.ts    The plain-text export
│       └── pdf.ts           The PDF export
│       └── storage.ts       Storage usage and "please keep my data"
└── tests/
    ├── unit/              Vitest tests (npm test)
    └── e2e/               Playwright tests (npm run test:e2e)
```

## Privacy

Everything you save stays on your device. Read [PRIVACY.md](PRIVACY.md) before changing how data is stored or sent.

## The earlier version

An earlier version of this app (a Next.js server with a SQLite database on the Mac) lives in git history before the "Phase 0" commit. It is not used and should not be copied back. The ideas carried over; the code did not.
