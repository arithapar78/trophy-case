# Trophy Case

Snap a photo. Save the win. Build your timeline.

A phone-first app for recording achievements the moment they happen — a medal, a certificate, a finished project — so that years later you still have the whole record instead of the three things you happen to remember.

## The problem it solves

By the time a student sits down to write college applications, they have to remember years of activities, awards and projects. Most of it is gone: the certificate went in a drawer, the photo is buried in a camera roll, the trophy is in a box somewhere.

Trophy Case makes saving an achievement take under 10 seconds: point the camera at the thing, type a title, tap a category, done.

## Who it's for

- **Students** (roughly ages 8–18) who want a running record of what they've done.
- **Parents** who want to capture their kid's wins before they're forgotten.

This version runs on your own computer, and your phone opens it over your home Wi-Fi. There are no accounts and nothing is uploaded to anyone's server.

## What it does right now

1. **Take a photo** — a big camera button at the bottom of the screen opens your phone's camera.
2. **Add the details** — a sheet slides up: title, category (one tap), date (already today) and an optional note.
3. **See your timeline** — every achievement, newest first, with its photo, plus search and a category filter.
4. **Fix mistakes** — edit anything, or delete it with a confirmation.

That's the whole app. It is deliberately small.

### It installs on your phone

Open it in Safari on your iPhone, tap the Share button, then **Add to Home Screen**. You get a trophy icon on your Home Screen, and tapping it opens the app full-screen with no address bar — it behaves like any other app on the phone. It follows your phone's light or dark mode automatically.

> **On the App Store?** Not yet, and this version can't be. A real App Store app needs an Apple Developer account ($99/year), a build made in Xcode, Apple's review process, and — the big one — your achievements would have to live on a server on the internet rather than on your own computer. The Home Screen install above gets you the same everyday feel without any of that. This app is built so that a real iOS wrapper can come later without redoing the work.

## What comes next (NOT built yet)

These are written down so we don't forget them, not so we build them now. One at a time, in this order:

1. **The AI essay-ideas feature** — reads your achievements and suggests college essay angles. This existed in an earlier version and was removed to get back to a solid core. It comes back first.
2. **The AI helper** — a chat assistant that sorts, tags and fills in achievements from a photo.
3. **Accounts and a hosted site** — so your timeline follows you to any device.
4. **A real native iOS app** — the actual App Store submission.

Also parked: sharing, reels/video, LinkedIn posts, life planning, payments.

## Tech stack

| Piece | What we use | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One tool for both the screen and the server |
| Styling | Tailwind CSS | Style directly in the markup, no separate stylesheets |
| Database | SQLite via Prisma | A single file on your computer, no cloud account |
| Photos | Local `/uploads` folder | Your photos stay on your machine |
| Camera | The browser's own file input | No camera library — the phone does the work |
| Unit tests | Vitest | Fast tests for the logic |
| Browser tests | Playwright | Drives a real browser at phone size |

There is **no AI in this version** and no API key is needed. The app makes no outbound network calls at all.

## Install and run it

Assume you've never done this before. Follow these in order.

### Step 0 — What you need first

You need **Node.js version 20 or newer**. To check, open Terminal and type:

```bash
node --version
```

If you see `v20.11.0` or higher, you're good. If you get "command not found" or a lower number, download the LTS version from https://nodejs.org, install it, then close and reopen Terminal.

### Step 1 — Go to the project folder

```bash
cd /Users/Ari/workplace/ari-workspace/projects/achievement-tracker
```

### Step 2 — Install the building blocks

```bash
npm install
```

This downloads every library the project needs into a `node_modules` folder. It takes a minute or two the first time, and you only do it once.

### Step 3 — Create the database

```bash
npm run db:push
```

This creates the SQLite database file and the table that holds achievements.

### Step 4 — Add sample data (optional)

```bash
npm run seed
```

Adds 8 example achievements for a made-up student, so you see the app working instead of an empty screen. Running it again replaces them rather than duplicating.

### Step 5 — Start the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

**The app only runs while that Terminal window is open.** That's normal — Trophy Case needs a running program to hold your database and save your photos, so there's no single file you can double-click. To stop it, click that window and press `Ctrl + C`.

## Opening it on your phone

The camera button only really does its job on a phone. To get it there:

1. Make sure your phone and this Mac are on **the same Wi-Fi network**.
2. Find this Mac's address on the network:

   ```bash
   ipconfig getifaddr en0
   ```

   That prints something like `192.168.1.42`.
3. Start the app so it accepts connections from other devices on the network:

   ```bash
   npm run dev -- --hostname 0.0.0.0
   ```

4. On your phone, open Safari and go to `http://192.168.1.42:3000` (using the number from step 2).
5. Tap Share → **Add to Home Screen** to install it.

If the page doesn't load, the usual cause is a firewall: check System Settings → Network → Firewall on this Mac.

> **A note on the camera:** browsers only allow camera access on a secure (`https://`) address, with one exception — `localhost`. Over plain `http://` to an IP address, tapping the camera button opens your **photo library** rather than the live camera. Everything else works exactly the same, and the photo still saves. Getting the true camera on your phone needs an `https` address, which is part of the hosted version listed under "What comes next".

## How to run the tests

**Unit tests** (fast, check the logic):

```bash
npm test
```

**Browser tests** (opens a real browser at phone size and clicks through the app):

```bash
npx playwright install chromium   # one time only
npm run test:e2e
```

## All the npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app at http://localhost:3000 |
| `npm run build` | Builds the production version |
| `npm start` | Runs the production build |
| `npm test` | Runs the unit tests once |
| `npm run test:watch` | Runs unit tests and re-runs them as you edit |
| `npm run test:e2e` | Runs the Playwright browser tests |
| `npm run seed` | Adds 8 sample achievements |
| `npm run db:push` | Creates or updates the database to match the schema |
| `npm run db:studio` | Opens a visual database browser |

## Folder structure

```
achievement-tracker/
├── README.md              You are here
├── REQUIREMENTS.md        What this version includes, with tests to check by hand
├── CLAUDE.md              Rules for Claude Code when working on this project
├── PRIVACY.md             How we keep a kid's data safe
├── .env.example           Template for settings (safe to commit)
├── .gitignore             Files git should ignore
├── prisma/
│   ├── schema.prisma      The shape of the database
│   ├── seed.ts            Script that adds 8 sample achievements
│   └── dev.db             The database file itself (NEVER committed)
├── prisma.config.ts       Tells the Prisma tools where the database is
├── public/
│   └── icon.svg           The trophy icon used on the Home Screen
├── src/
│   ├── app/
│   │   ├── page.tsx       The one screen: the timeline
│   │   ├── layout.tsx     The page shell, and the phone viewport settings
│   │   ├── manifest.ts    What makes it installable on a Home Screen
│   │   ├── globals.css    The colours, light and dark, in one place
│   │   └── api/           Server endpoints the screen talks to
│   │       ├── achievements/       List and create
│   │       ├── achievements/[id]/  Edit and delete one
│   │       └── uploads/[filename]/ Serves your photos back
│   ├── components/
│   │   ├── CameraButton.tsx      The big round camera button
│   │   ├── AchievementSheet.tsx  The slide-up details form
│   │   ├── AchievementCard.tsx   One card on the timeline
│   │   └── TimelineFilters.tsx   Search box and category chips
│   └── lib/
│       ├── db.ts            The one database connection
│       ├── achievements.ts  Create, edit, delete, list logic
│       ├── validation.ts    The rules for a valid achievement
│       ├── uploads.ts       Saving and deleting photos
│       ├── paths.ts         Where the data lives
│       ├── dates.ts         Timezone-safe date handling
│       └── types.ts         Shared shapes
├── tests/
│   ├── unit/              Vitest tests (npm test)
│   └── e2e/               Playwright tests (npm run test:e2e)
└── uploads/               Your photos (NEVER committed)
```

## Privacy

Everything stays on this computer. Your photos are written to the `uploads` folder, your achievements to a SQLite file, and nothing is sent over the internet — this version has no outbound network calls at all.

This app is built to hold a child's personal information. Read [PRIVACY.md](PRIVACY.md) before you change how data is stored, or before putting this online.
