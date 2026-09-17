# Trophy Case

A personal achievement timeline. Save every win — big and small — from a young age, and let AI help turn them into college essay ideas later.

## The problem it solves

By the time a student sits down to write college applications, they have to remember years of activities, awards, and projects. Most of it is gone: the certificate went in a drawer, the photo is buried in a camera roll, the debate trophy is in a box somewhere. Students end up writing essays about the three things they happen to remember instead of the things that actually shaped them.

Trophy Case fixes this by making it take less than 10 seconds to save an achievement the moment it happens. Years later, the timeline is still there — and the AI can read all of it at once.

## Who it's for

- **Students** (roughly ages 8–18) who want a running record of what they've done.
- **Parents** who want to capture their kid's wins before they're forgotten.

Version 1 is a single-user app that runs on your own computer. There are no accounts and nothing is uploaded to a server.

## MVP features (version 1)

1. **Add an achievement in under 10 seconds** — title, date, category (School, Sports, Debate, Cooking, Arts, Other), a short note, and an optional photo or PDF.
2. **Timeline view** — every achievement, newest first, with a category filter and a search box.
3. **Edit and delete** — fix a typo or remove something you didn't mean to save.
4. **AI essay ideas** — a "Give me 3 college essay ideas" button that reads your achievements and returns 3 ideas, each with a one-line hook and the list of achievements it draws on.

## Future ideas (NOT in version 1)

These are deliberately out of scope for v1. They're written down so we don't forget them, not so we build them now.

- Reels / short video creation from achievements
- LinkedIn posts and profile generation
- Life plan and "what to do next" coaching
- Parent accounts (separate logins linked to a student)
- Sharing achievements or timelines with other people
- A mobile app
- Payments and subscriptions

### Future plan: free vs. Pro, and one shared AI assistant

Parked here, not being built yet. This all needs a hosted version with accounts, which v1 is not.

**One AI assistant ("the helper")** that does all the smart jobs:
- sorts and tags achievements
- edits an achievement based on what you upload (e.g. reads a certificate and fills in the title and date)
- writes LinkedIn post templates
- suggests colleges
- builds life plans
- can read your files, but only the ones you pick

**Who can use it:** anyone on the internet, with an account.
- Free: 10 prompts, then it resets 5 hours later.
- Pro: higher limit, plus college recommendations.

**Free vs. Pro:**

| Feature | Free | Pro |
|---|---|---|
| Timeline, add/edit/delete | Yes | Yes |
| The AI helper | 10 prompts every 5 hours | Higher limit |
| College recommendations | No | Yes |
| Uploaded photos | Deleted after 60 days | Kept forever |
| Avatar customization | Basic | Separate paid add-on |

**Low-energy AI:** this project will live on learntav.com, which is built to be energy efficient, so the helper should be too:
- use the smallest model that does the job well (a "Haiku"-size model for most tasks)
- keep prompts short and send only the achievements needed, not the whole history
- save (cache) answers so the same question isn't asked twice
- don't send photos to the AI unless the job needs them

**Open questions to settle before building:**
1. Anonymous users can't be rate-limited fairly (they just clear cookies), so free use needs a login.
2. Before a free user's photo is deleted at day 60, warn them and let them download it. The achievement itself stays; only the file goes.
3. Hosting kids' data online means COPPA applies (see PRIVACY.md): parental consent for under-13s, and strip location data from photos.
4. Every free prompt costs real money. Set a monthly spending cap on the API key.

## Tech stack

| Piece | What we use | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One tool for both the page and the server |
| Styling | Tailwind CSS | Style directly in the markup, no separate CSS files |
| Database | SQLite via Prisma | A single file on your computer, no cloud account |
| File uploads | Local `/uploads` folder | Photos and PDFs stay on your machine |
| AI | Claude API (Anthropic SDK) | Generates the essay ideas |
| Unit tests | Vitest | Fast tests for the logic |
| End-to-end test | Playwright | Drives a real browser like a real user |

If you don't have a Claude API key, the app runs in **MOCK mode** and returns sample essay ideas so everything still works.

## Install and run it

Assume you've never done this before. Follow these in order.

### Step 0 — What you need first

You need **Node.js version 20 or newer**. To check, open Terminal and type:

```bash
node --version
```

If you see something like `v20.11.0` or higher, you're good. If you get "command not found" or a lower number, download the LTS version from https://nodejs.org and install it, then close and reopen Terminal.

### Step 1 — Go to the project folder

```bash
cd /Users/Ari/workplace/ari-workspace/projects/achievement-tracker
```

### Step 2 — Install the building blocks

```bash
npm install
```

This downloads every library the project needs into a `node_modules` folder. It takes a minute or two the first time. You only do this once (and again whenever we add a new library).

### Step 3 — Set up your settings file

```bash
cp .env.example .env.local
```

This makes your private settings file from the example. Open `.env.local` in a text editor. If you have a Claude API key, paste it after `ANTHROPIC_API_KEY=`. **If you don't have one, leave it blank** — the app will use MOCK mode and still work.

### Step 4 — Create the database

```bash
npm run db:push
```

This creates the SQLite database file and sets up the table that holds achievements.

### Step 5 — Add sample data (optional but recommended)

```bash
npm run seed
```

This adds 8 example achievements for a made-up student so you can see the app working immediately instead of staring at an empty screen.

### Step 6 — Start the app

**The easy way:** double-click **Trophy Case** on your Desktop. A Terminal
window opens, the app starts, and your browser opens automatically.

**The manual way:**

```bash
npm run dev
```

Then open your browser to **http://localhost:3000**.

To stop the app either way: close that Terminal window, or click it and press
`Ctrl + C`.

### About the desktop launcher

The Desktop icon runs `scripts/start-trophy-case.sh`, which:

- Starts the app and opens your browser once it's actually ready
- Notices if it's already running and just opens the browser instead of
  starting a second copy
- Sets up the database and sample data on a first run
- Tells you what to do if Node.js isn't installed

**The app only runs while that Terminal window is open.** This is normal:
Trophy Case needs a running program to hold your database and save your
photos, so there's no single file you can open on its own.

If you ever move or rename the project folder, the launcher will say so —
ask Claude to point it at the new location.

## How to run the tests

**Unit tests** (fast, check the logic):

```bash
npm test
```

**End-to-end test** (opens a real browser and clicks through the app):

```bash
npx playwright install chromium   # one time only
npm run test:e2e
```

## All the npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app for development at http://localhost:3000 |
| `npm run build` | Builds the production version |
| `npm start` | Runs the production build |
| `npm test` | Runs the unit tests once |
| `npm run test:watch` | Runs unit tests and re-runs them as you edit |
| `npm run test:e2e` | Runs the Playwright browser test |
| `npm run seed` | Adds 8 sample achievements |
| `npm run db:push` | Creates or updates the database to match the schema |
| `npm run db:studio` | Opens a visual database browser |
| `npm run start:live` | Starts the live site on port 3100 (see below) |
| `npm run stop:live` | Stops the live site |

## Folder structure

```
achievement-tracker/
├── README.md              You are here
├── REQUIREMENTS.md        User stories + acceptance criteria to test by hand
├── CLAUDE.md              Rules for Claude Code when working on this project
├── PRIVACY.md             How we keep a kid's data safe
├── .env.example           Template for settings (safe to commit)
├── .env.local             Your real settings (NEVER committed)
├── .gitignore             Files git should ignore
├── prisma/
│   ├── schema.prisma      The shape of the database
│   ├── seed.ts            Script that adds 8 sample achievements
│   └── dev.db             The database file itself (NEVER committed)
├── prisma.config.ts       Tells the Prisma tools where the database is
├── src/
│   ├── app/
│   │   ├── page.tsx       The timeline page
│   │   ├── layout.tsx     The page shell
│   │   └── api/           Server endpoints the page talks to
│   │       ├── achievements/       List and create
│   │       ├── achievements/[id]/  Edit and delete one
│   │       ├── essay-ideas/        The AI feature
│   │       └── uploads/[filename]/ Serves your photos and PDFs
│   ├── components/
│   │   ├── AchievementForm.tsx   Add and edit form
│   │   ├── AchievementCard.tsx   One row on the timeline
│   │   ├── TimelineFilters.tsx   Search box and category chips
│   │   └── EssayIdeas.tsx        The essay ideas button and results
│   └── lib/
│       ├── db.ts          The one database connection
│       ├── achievements.ts Create, edit, delete, list logic
│       ├── validation.ts  The rules for a valid achievement
│       ├── uploads.ts     Saving and deleting attached files
│       ├── essay-ideas.ts The Claude API call, with MOCK fallback
│       └── dates.ts       Timezone-safe date handling
├── tests/
│   ├── unit/              Vitest tests (run with npm test)
│   └── e2e/               Playwright tests (run with npm run test:e2e)
└── uploads/               Photos and PDFs you upload (NEVER committed)
```

## The AI essay ideas feature

Click **"Give me 3 college essay ideas"** and Claude reads your achievements,
then suggests three angles for a college essay. Each idea has a title, a
one-line hook, and the list of achievements it draws on.

**Without an API key** the app runs in MOCK mode: it returns clearly labelled
sample ideas so you can see how the feature works. A yellow banner says so, and
no network call is made.

**With an API key** you get real suggestions. To set one up:

1. Go to https://console.anthropic.com and create an API key.
2. Open `.env.local` and paste it after `ANTHROPIC_API_KEY=`.
3. Restart the app (`Ctrl + C`, then `npm run dev` again) — the key is only
   read at startup.

Only the **text** of your achievements (titles, dates, categories, notes) is
sent. Your photos and PDFs never leave your computer. The key is used on the
server only and is never sent to your browser.

## Running the live site

The live site is the public one. It runs the production build on this Mac,
on **port 3100**, with its own data in `~/TrophyCaseLive/` — completely
separate from your personal copy on port 3000.

**It is not on the internet yet.** Tailscale Funnel is what would make it
public, and that stays off until the per-visitor privacy features are built.
Right now the live site is reachable only from this Mac.

### One-time setup

```bash
cp .env.production.example .env.production.local
```

Open `.env.production.local` and check the paths point somewhere under
`~/TrophyCaseLive`. Add an API key if you want the AI to work — use a
**separate key** from your personal one, with a monthly spending limit set in
the Anthropic Console, so the live site can be switched off on its own and a
runaway cost is capped. Leave it blank to run with no AI costs at all.

### Start it

```bash
npm run start:live
```

This checks Node, creates the data folder, sets up the live database, builds
the production version, keeps the Mac awake, and starts the site. Then open
**http://127.0.0.1:3100**.

### Stop it

```bash
npm run stop:live
```

This turns the public address off first, then stops the app and lets the Mac
sleep normally again.

### Update it

```bash
npm run stop:live
npm run start:live
```

The start script rebuilds every time, so your latest changes are picked up.

### Emergency: take it off the internet now

Once the funnel is on, this is the fastest way to make the site unreachable:

```bash
tailscale funnel --https=443 off
```

Or just `npm run stop:live`, which does that first before anything else.

### What's different on the live site

| | Your copy (3000) | Live site (3100) |
|---|---|---|
| Data | `prisma/dev.db`, `./uploads` | `~/TrophyCaseLive/` |
| Plan switch | Works | Hidden and refused |
| Test clock | Works | Hidden and refused |
| Everyone's plan | Your choice | Always Free |

### Restoring from a backup

**From an app backup** (taken every 6 hours, newest 8 kept):

```bash
npm run stop:live
ls -la ~/TrophyCaseLive/backups          # find the one you want
cp ~/TrophyCaseLive/backups/<file> ~/TrophyCaseLive/trophy-case.db
npm run start:live
```

**From Time Machine:** open Time Machine, browse to `~/TrophyCaseLive`, pick a
date before the problem, and restore the whole folder. Stop the live site
first.

## Privacy

This app is built to hold a child's personal information. Read [PRIVACY.md](PRIVACY.md) before you change how data is stored or before putting this online.
