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

```bash
npm run dev
```

Then open your browser to **http://localhost:3000**.

To stop the app, click on the Terminal window and press `Ctrl + C`.

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

## Privacy

This app is built to hold a child's personal information. Read [PRIVACY.md](PRIVACY.md) before you change how data is stored or before putting this online.
