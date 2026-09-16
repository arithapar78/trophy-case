# Requirements: Trophy Case v3 (live on the internet)

The contract for version 3. Same rule as v1 and v2: if a feature isn't in this file, it doesn't get built.

**The goal:** Trophy Case runs at a public URL. Anyone can open it, keep their own private timeline with photos, and use the AI features with a limit of 10 prompts per 5 hours. Their data lives in a storage folder on the web server and is backed up automatically. The paywall comes later.

**Status: DRAFT. Waiting for approval. No code until the Open Questions are answered.**

---

## What carries over

Everything in [REQUIREMENTS.md](REQUIREMENTS.md) and [REQUIREMENTS-v2.md](REQUIREMENTS-v2.md) still applies, with these changes:

- v2's "everything stays local" rule (N2.1) is replaced by this file's hosting rules.
- The tech stack stays the same: Next.js, Prisma + SQLite, a local `/uploads` folder, the Anthropic SDK with `claude-haiku-4-5`. On the server, that "local" folder and database live on the host's persistent disk.
- The low-energy AI rules (E.1 to E.8) still apply to every AI call.

**Depends on v2 Feature 2 (AI helper with a prompt limit).** The prompt limit has to exist before strangers can reach the AI. Build order: finish v2 Feature 2, then v3, then the rest of v2.

---

## Definitions

**Host**: the company that runs the app on the internet. It pulls the code from GitHub (`arithapar78/trophy-case`) and redeploys on every push to `main`.

**Persistent disk**: a storage folder on the host that survives restarts and redeploys. It holds the SQLite database and the uploads. A normal web host wipes its files on every deploy; a persistent disk doesn't.

**Visitor**: one person using the site, recognized by a private ID saved in their browser. Each visitor has their own achievements, uploads, helper chat and prompt count.

**Snapshot**: a full copy of the persistent disk that the host takes automatically.

---

## Feature 1: Hosting from GitHub

> **As the owner, I want** the app to update itself when I push to GitHub **so that** publishing a change is one step.

### Acceptance criteria

- [ ] 1.1 The app is reachable at a public `https://` URL.
- [ ] 1.2 Pushing to `main` on GitHub redeploys the app automatically.
- [ ] 1.3 A deploy that fails its build does not replace the working site.
- [ ] 1.4 The database and uploads live on the persistent disk, not inside the code folder.
- [ ] 1.5 The database path and uploads folder are set with environment variables (`DATABASE_URL`, `UPLOADS_DIR`), with the current local paths as defaults, so `npm run dev` still works on the laptop exactly as before.
- [ ] 1.6 Achievements and photos survive a redeploy and a restart.
- [ ] 1.7 `ANTHROPIC_API_KEY` is set in the host's secret settings, never in the repo.
- [ ] 1.8 The dev-only fake clock and the Free/Pro test switch are hidden and refused by the server in production. Everyone online is on Free.
- [ ] 1.9 The README explains, step by step, how the site is deployed and how to change the environment variables.

---

## Feature 2: Private space for each visitor

> **As a visitor, I want** my achievements to be mine alone **so that** strangers can't see or change them.

### Acceptance criteria

- [ ] 2.1 On first visit, the server creates a new visitor and saves its ID in a secure cookie (`HttpOnly`, `Secure`, `SameSite=Lax`).
- [ ] 2.2 Every achievement, upload, helper message, cached answer and saved plan belongs to exactly one visitor.
- [ ] 2.3 A visitor only ever sees their own achievements.
- [ ] 2.4 A visitor cannot view, edit or delete another visitor's achievement, even by typing its ID into a request. The server refuses it.
- [ ] 2.5 A visitor cannot open another visitor's uploaded file, even with the exact file URL. The server refuses it.
- [ ] 2.6 Two browsers open side by side show two separate, empty timelines.
- [ ] 2.7 The site says plainly, on first visit, that the timeline is tied to this browser and clearing browser data will lose access (see Open Question 1).
- [ ] 2.8 Existing local data is not uploaded or merged into the website.

---

## Feature 3: Per-visitor prompt limit and cost protection

> **As the person paying the API bill, I want** limits that strangers can't get around **so that** the site can't run up a big bill.

### Acceptance criteria

- [ ] 3.1 Each visitor gets 10 prompts per 5-hour window, counted separately from everyone else.
- [ ] 3.2 One visitor using up their prompts doesn't affect anyone else.
- [ ] 3.3 The limit is checked on the server for every AI endpoint, including the v1 essay-ideas button.
- [ ] 3.4 A second, per-network limit stops one person from getting unlimited prompts by clearing cookies (number in Open Question 2).
- [ ] 3.5 A site-wide daily cap stops all AI calls once reached. Visitors see a plain message that the AI is resting until tomorrow, and the rest of the app keeps working.
- [ ] 3.6 The README tells the owner to set a monthly spending limit on the API key in the Anthropic Console. This is the last line of defense if the code limits ever fail.
- [ ] 3.7 Failed AI calls still don't use up a prompt (v2 criterion 2.17).

---

## Feature 4: Storage limits and backups

> **As a visitor, I want** my photos kept safe **so that** a server problem doesn't erase my record.

> **As the owner, I want** storage to have limits **so that** one person can't fill the disk.

### Acceptance criteria

- [ ] 4.1 The host takes an automatic snapshot of the persistent disk at least once a day.
- [ ] 4.2 The app also makes its own backup copy of the database every 6 hours into a `backups` folder on the disk, keeping the last 8 copies (2 days). This protects against a bad deploy or a coding mistake.
- [ ] 4.3 A backup is a safe copy of the database, taken without stopping the app.
- [ ] 4.4 The README explains how to restore from a snapshot and from an app backup, in plain steps.
- [ ] 4.5 Each visitor has a storage limit (proposed: 50 MB). Going over shows a plain message and does not save the file.
- [ ] 4.6 The v1 per-file limit (10 MB, images and PDFs only) still applies.
- [ ] 4.7 v2's 60-day photo expiry on Free applies online too, so storage doesn't grow forever.
- [ ] 4.8 A visitor who hasn't visited for a long time has their data deleted (length in Open Question 4). The first-visit message and the Privacy page both say how long.

---

## Feature 5: Privacy and safety for a public site

> **As a parent, I want** a clear, honest explanation of what happens to my kid's data **so that** I can decide whether to use it.

### Acceptance criteria

- [ ] 5.1 Location data (GPS) and other hidden photo data are removed from every uploaded image before it is saved (see Open Question 3).
- [ ] 5.2 There is a Privacy page, linked from every page, that says in plain English what is stored, where, for how long, what is sent to the Claude API, and how to delete it.
- [ ] 5.3 First visit asks the visitor to confirm they are 13 or older, or a parent or guardian setting it up. Under-13s are told the site isn't for them yet. (A self-declared age check is not COPPA's verified parental consent. Real under-13 support needs legal advice first; see PRIVACY.md.)
- [ ] 5.4 Settings has a "Delete all my data" button that, after a confirm, removes every achievement, file, chat and plan for that visitor from the database and the disk.
- [ ] 5.5 Deleted data is not restored into the live site from backups. Backups age out on their own schedule.
- [ ] 5.6 No analytics, tracking, ads or crash-reporting services.
- [ ] 5.7 Server logs never contain achievement text, file contents or the API key.
- [ ] 5.8 Files are never publicly listed and are never sent to the AI unless that file's "AI can read this" switch is on (v2 Feature 8).
- [ ] 5.9 PRIVACY.md is updated to describe the hosted version.

---

## Non-functional requirements

- [ ] N3.1 Every v1 and v2 test still passes.
- [ ] N3.2 `npm run build` completes with no TypeScript errors.
- [ ] N3.3 The app still runs locally with `npm run dev` and no host account.
- [ ] N3.4 No new libraries without asking first.
- [ ] N3.5 The site works on a phone browser.
- [ ] N3.6 The GitHub repo never contains `.env.local`, the database, uploads or backups. (Checked on 2026-09-16: the history is clean.)

---

## Tests required

**Unit (Vitest)**

- [ ] T3.1 A new visitor gets a new ID; a returning visitor keeps theirs.
- [ ] T3.2 Listing achievements returns only the current visitor's.
- [ ] T3.3 Editing or deleting another visitor's achievement is refused and changes nothing.
- [ ] T3.4 Reading another visitor's file is refused.
- [ ] T3.5 Prompt counts are separate per visitor.
- [ ] T3.6 The per-network limit blocks prompts after its number is reached.
- [ ] T3.7 The site-wide daily cap blocks all AI calls and resets the next day (fake clock).
- [ ] T3.8 An upload over the visitor's storage limit is refused.
- [ ] T3.9 GPS data is gone from a saved photo that had it.
- [ ] T3.10 "Delete all my data" removes the visitor's rows and files.
- [ ] T3.11 The backup job creates a copy and keeps only the newest 8.
- [ ] T3.12 The fake clock and plan switch are refused in production mode.
- [ ] T3.13 `DATABASE_URL` and `UPLOADS_DIR` are respected, with local defaults.

**End-to-end (Playwright)**

- [ ] T3.14 Two separate browsers each add an achievement and each sees only their own.
- [ ] T3.15 A visitor uses up their 10 prompts and sees the reset time; a second visitor can still send prompts.
- [ ] T3.16 "Delete all my data" leaves an empty timeline after refresh.

---

## Open questions (answer before building)

1. **Keeping a timeline across devices without logins.** With a browser-only ID, clearing browser data or switching phones loses access. Options:
   a) Accept it for now; real logins arrive with the paywall. **(Recommended: simplest.)**
   b) Show each visitor a private "recovery code" they can save and type on another device.
   c) Build real logins now (email sign-in). Much more work, and it's what the paywall will need anyway.

2. **Per-network limit and daily cap numbers.** Proposed: 30 prompts per 5 hours per network (a household or school may share one), and 500 prompts per day site-wide. Adjust to your budget.

3. **Removing photo location data needs a library.** Doing it by hand is error-prone. Proposed: `sharp`, a widely used image library that can re-save images without their hidden data. Approve or suggest another. PDFs can also carry hidden info; proposed: leave PDFs as-is for v3 and say so on the Privacy page.

4. **Inactive visitor cleanup.** Proposed: delete data after 180 days with no visit. Or never delete.

5. **Which host.** Both run the app as-is with a persistent disk and daily snapshots. Neither has a free plan that includes a disk. Check current prices before choosing.
   a) **Render**: connects to GitHub in a few clicks, daily disk snapshots kept at least 7 days. The site blips offline for a few seconds on each deploy. **(Recommended: easiest.)**
   b) **Fly.io**: daily snapshots, retention adjustable from 1 to 60 days. More setup, done with a command-line tool.

6. **Off-site backups.** Snapshots live with the same host. A copy at a second company protects against losing the host account, but that means a new third-party service seeing kids' data. Proposed: not in v3.

7. **Domain name.** Use the host's free address (like `trophy-case.onrender.com`) for now, or buy a custom domain?

---

## Out of scope for v3

Real payments and the paywall, Pro upgrades, real logins (unless Question 1 picks c), sharing timelines, reels, mobile app, and support for under-13s.

## Owner to-do (not code)

These are steps only you can do, in your own accounts:

1. Create the host account and connect it to the `arithapar78/trophy-case` GitHub repo.
2. Add the persistent disk and set `DATABASE_URL`, `UPLOADS_DIR` and `ANTHROPIC_API_KEY` in the host's settings.
3. Set a monthly spending limit on the API key in the Anthropic Console.
4. Consider a separate API key just for the website, so it can be switched off without affecting your laptop copy.
