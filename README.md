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
| 3. AI photo read | AI drafts the title from the photo. Off by default, a button each time to turn it on. 10 uses per 5 hours |
| 4. Goal and ranking | Set a goal, see which achievements matter most and what to do next. Export as PDF or text |
| Later | Accounts, a $10/month Pro plan, the assistant, app store listings |

## Tech stack

| Piece | What we use | Why |
|---|---|---|
| App | Vite + React + TypeScript | Builds a static page that runs entirely on the phone |
| Styling | Tailwind CSS | Style directly in the markup, no separate stylesheets |
| Storage | Dexie (over the browser's IndexedDB) | The phone's built-in database. Photos included. Nothing leaves the device |
| Camera | The browser's own file input | The phone does the work, no camera library |
| Offline and install | A service worker (vite-plugin-pwa) | Opens with no signal, installs to the Home Screen |
| Backup | fflate (a tiny zip library) | One zip file with your achievements and photos |
| AI (Phase 3) | Anthropic SDK inside one small serverless function | The key stays on the server side, never in the app. MOCK mode when there is no key |
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

## The live site (GitHub Pages)

Every push to `main` on GitHub builds the app and publishes it at
**https://arithapar78.github.io/trophy-case/**. That is a real https address, so the
phone camera and Add to Home Screen both work there. GitHub only serves the code;
what you save stays on your phone.

One-time setup on GitHub: open the repo, Settings, Pages, and under "Build and
deployment" set Source to **GitHub Actions**. After that, `git push` is the whole
deploy.

To publish from your Mac:

```bash
git push Trophy-Case main
```

Then watch the Actions tab on GitHub; the site updates a minute or two later.

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

These build the app first and test the built files, the same ones GitHub Pages
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
│       └── storage.ts       Storage usage and "please keep my data"
└── tests/
    ├── unit/              Vitest tests (npm test)
    └── e2e/               Playwright tests (npm run test:e2e)
```

## Privacy

Everything you save stays on your device. Read [PRIVACY.md](PRIVACY.md) before changing how data is stored or sent.

## The earlier version

An earlier version of this app (a Next.js server with a SQLite database on the Mac) lives in git history before the "Phase 0" commit. It is not used and should not be copied back. The ideas carried over; the code did not.
