# Requirements: Trophy Case v3 (live on the internet)

The contract for version 3. Same rule as v1 and v2: if a feature isn't in this file, it doesn't get built.

**The goal:** Trophy Case runs at a public `https://` address, for free. The app runs on the owner's Mac; **Tailscale Funnel** gives it a public address like `trophy-case.<tailnet>.ts.net`. Anyone can open it, keep their own private timeline with photos, and use the AI features with a limit of 10 prompts per 5 hours. Their data stays on that Mac and is backed up. The paywall comes later.

GitHub (`arithapar78/trophy-case`) holds the safe copy of the **code**. It does not run the site.

**Accepted trade-off:** the site is only up while that Mac is awake and online. Moving to a paid host like Render later should need no code changes, only different settings.

**Status: APPROVED. Build in the order set out in the kickoff prompt.**

---

## What carries over

Everything in [REQUIREMENTS.md](REQUIREMENTS.md) and [REQUIREMENTS-v2.md](REQUIREMENTS-v2.md) still applies, with these changes:

- v2's "everything stays local" rule (N2.1) is replaced by this file's hosting rules. Data is still on the owner's own computer — it is now reachable from the internet.
- The tech stack stays the same: Next.js, Prisma + SQLite, an uploads folder, the Anthropic SDK with `claude-haiku-4-5`. For the live site, that folder and the database live in `~/TrophyCaseLive/`, outside the repo.
- The low-energy AI rules (E.1 to E.8) still apply to every AI call.

**Depends on v2 Feature 2 (AI helper with a prompt limit).** The prompt limit has to exist before strangers can reach the AI. Build order: finish v2 Feature 2, then v3, then the rest of v2.

---

## Definitions

**The live site**: the production build of the app, running on the owner's Mac on port 3100, listening only on `127.0.0.1`.

**Tailscale Funnel**: a free service that gives the live site a public `https://` address and forwards visitors to it. It is the only way in from the internet.

**The live data folder**: `~/TrophyCaseLive/`, outside the repo. Holds `trophy-case.db`, `uploads/` and `backups/`. Kept completely separate from the owner's personal local copy.

**Visitor**: one person using the site, recognized by a private ID saved in their browser. Each visitor has their own achievements, uploads, helper chat and prompt count.

**The local copy**: what `npm run dev` runs — the owner's own machine, port 3000, its own database and uploads. Never used by the live site.

---

## Feature 1: Live from this Mac

> **As the owner, I want** the app to run live from my own computer for free **so that** anyone can use it without me paying for hosting.

### Acceptance criteria

**How it runs**

- [ ] 1.1 The live site runs the **production build** (`npm run build`, then `next start`) — never `npm run dev`.
- [ ] 1.2 The live site uses **port 3100**, so it never clashes with the local copy on port 3000.
- [ ] 1.3 Both can run at the same time without interfering.
- [ ] 1.4 The live site listens only on `127.0.0.1`, so another device on the Wi-Fi cannot reach `http://<Mac's IP>:3100` directly and skip the limits.
- [ ] 1.5 The only way in from the internet is Tailscale Funnel.
- [ ] 1.6 The app is reachable at a public `https://` address once the funnel is on.

**Separate live data**

- [ ] 1.7 The live site's data lives in `~/TrophyCaseLive/`, outside the repo: `trophy-case.db`, `uploads/`, `backups/`.
- [ ] 1.8 The paths come from `DATABASE_URL`, `UPLOADS_DIR` and `BACKUPS_DIR`, set in `.env.production.local`, which is git-ignored.
- [ ] 1.9 The defaults stay today's local paths, so `npm run dev` works exactly as before with no env file.
- [ ] 1.10 The owner's personal database and uploads are **never** read by, written to, or mixed into the live site. Verified by checking which files the running live site actually opens, not by reading the config.
- [ ] 1.11 Achievements and photos survive stopping and restarting the live site.
- [ ] 1.12 `ANTHROPIC_API_KEY` for the live site is set in `.env.production.local`, never in the repo.

**Start and stop scripts**

- [ ] 1.13 `scripts/start-live.sh` checks Node is installed and says what to do if not.
- [ ] 1.14 It creates the live data folder if missing.
- [ ] 1.15 It creates or updates the database schema, pointed at the **live** database — not `prisma/dev.db`.
- [ ] 1.16 It builds the app.
- [ ] 1.17 It starts the app on port 3100.
- [ ] 1.18 It turns the funnel on.
- [ ] 1.19 It keeps the Mac awake while running (`caffeinate`).
- [ ] 1.20 Its messages are plain English, like the existing desktop launcher.
- [ ] 1.21 `scripts/stop-live.sh` turns the funnel off and stops the app.
- [ ] 1.22 Running the start script twice doesn't start a second copy.
- [ ] 1.23 Neither script ever prints the API key or any achievement text.

**Production lockdown**

- [ ] 1.24 The dev-only fake clock is hidden in the UI in production.
- [ ] 1.25 The server refuses clock changes in production, even by direct request.
- [ ] 1.26 The Free/Pro switch is hidden in the UI in production.
- [ ] 1.27 The server refuses plan changes in production, even by direct request.
- [ ] 1.28 Everyone online is on Free.

**Updating and documentation**

- [ ] 1.29 Updating the live site is: commit or pull the change, then run the start script again.
- [ ] 1.30 The README has a "Running the live site" section covering start, stop, update, emergency funnel-off, restoring from an app backup, and restoring from Time Machine.

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
- [ ] 2.7 The site says plainly, on first visit, that the timeline is tied to this browser and that clearing browser data will lose access (Decision 1).
- [ ] 2.8 Existing local data is not uploaded or merged into the website.

---

## Feature 3: Per-visitor prompt limit and cost protection

> **As the person paying the API bill, I want** limits that strangers can't get around **so that** the site can't run up a big bill.

### Acceptance criteria

- [ ] 3.1 Each visitor gets 10 prompts per 5-hour window, counted separately from everyone else.
- [ ] 3.2 One visitor using up their prompts doesn't affect anyone else.
- [ ] 3.3 The limit is checked on the server for every AI endpoint, including the v1 essay-ideas button.
- [ ] 3.4 A second, per-network limit of 30 prompts per 5 hours stops one person getting unlimited prompts by clearing cookies (Decision 2).
- [ ] 3.5 A site-wide daily cap of 500 prompts stops all AI calls once reached. Visitors see a plain message that the AI is resting until tomorrow, and the rest of the app keeps working.
- [ ] 3.6 The README tells the owner to set a monthly spending limit on the API key in the Anthropic Console. This is the last line of defense if the code limits ever fail.
- [ ] 3.7 Failed AI calls still don't use up a prompt (v2 criterion 2.17).

---

## Feature 4: Storage limits and backups

> **As a visitor, I want** my photos kept safe **so that** a server problem doesn't erase my record.

> **As the owner, I want** storage to have limits **so that** one person can't fill the disk.

### Acceptance criteria

- [ ] 4.1 Time Machine is on and includes `~/TrophyCaseLive`. Checked by hand by the owner; not something the app can verify.
- [ ] 4.2 The app makes its own backup copy of the database every 6 hours into `~/TrophyCaseLive/backups`, keeping the newest 8 (2 days). This protects against a bad update or a coding mistake.
- [ ] 4.3 A backup is a safe copy of the database, taken without stopping the app.
- [ ] 4.4 The README explains how to restore from an app backup and from Time Machine, in plain steps.
- [ ] 4.5 Each visitor has a storage limit (proposed: 50 MB). Going over shows a plain message and does not save the file.
- [ ] 4.6 The v1 per-file limit (10 MB, images and PDFs only) still applies.
- [ ] 4.7 v2's 60-day photo expiry on Free applies online too, so storage doesn't grow forever.
- [ ] 4.8 A visitor who hasn't returned for 180 days has their data deleted (Decision 4). The first-visit message and the Privacy page both say how long.

---

## Feature 5: Privacy and safety for a public site

> **As a parent, I want** a clear, honest explanation of what happens to my kid's data **so that** I can decide whether to use it.

### Acceptance criteria

- [ ] 5.1 Location data (GPS) and other hidden photo data are removed from every uploaded image before it is saved, using `sharp` (Decision 3). PDFs keep theirs in v3, and the Privacy page says so.
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
- [ ] N3.3 The app still runs locally with `npm run dev`, on port 3000, with its own data, and with no Tailscale account needed.
- [ ] N3.4 No new libraries without asking first.
- [ ] N3.5 The site works on a phone browser.
- [ ] N3.6 The GitHub repo never contains `.env.local`, `.env.production.local`, any database, uploads or backups. (Checked 2026-09-16 and again 2026-09-17: the whole history is clean.)

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
- [ ] T3.13 `DATABASE_URL`, `UPLOADS_DIR` and `BACKUPS_DIR` are respected, with today's local paths as defaults.
- [ ] T3.17 With the live env vars set, uploads are written to the live folder and never to the repo's `/uploads`.
- [ ] T3.18 The uploads path is read at call time, not frozen when the module first loads, so the live and local copies can't end up sharing one folder.

**End-to-end (Playwright)**

- [ ] T3.14 Two separate browsers each add an achievement and each sees only their own.
- [ ] T3.15 A visitor uses up their 10 prompts and sees the reset time; a second visitor can still send prompts.
- [ ] T3.16 "Delete all my data" leaves an empty timeline after refresh.

**By hand (can't be automated)**

- [ ] T3.19 With the live site running, `http://<Mac's Wi-Fi IP>:3100` from another device on the same Wi-Fi does **not** connect (criterion 1.4).
- [ ] T3.20 The live site and the local copy run at the same time, on 3100 and 3000, each showing its own separate data (criteria 1.3, 1.10).
- [ ] T3.21 Time Machine is on and includes `~/TrophyCaseLive` (criterion 4.1).

---

## Decisions (settled 2026-09-17)

These were open questions; all are now answered and built to.

1. **Timeline across devices: accept the limitation for now.** The timeline is
   tied to the browser. Clearing browser data or switching phones loses access.
   Real logins arrive with the paywall. First visit says this plainly
   (criterion 2.7).

2. **Limits:** 10 prompts per visitor per 5 hours, 30 per network per 5 hours,
   500 per day site-wide. All three numbers live in one constants file. The
   daily cap can be overridden with an `AI_DAILY_CAP` environment variable.

3. **Photo location data:** `sharp` is approved, to strip hidden data (EXIF,
   GPS) from images before saving. **PDFs are left as-is in v3**, and the
   Privacy page says so. No other new libraries without asking.

4. **Inactive visitors:** data is deleted after 180 days with no visit.

5. **Host: this Mac, with Tailscale Funnel (free).** Render is the upgrade path
   later, and should need only different settings, not code changes.

6. **Backups:**
   - The app's own backups every 6 hours into `~/TrophyCaseLive/backups`,
     keeping the newest 8.
   - Time Machine covers the whole `~/TrophyCaseLive` folder.
   - No other off-site backup in v3.

7. **Domain:** the free `ts.net` address from Tailscale.

---

## Out of scope for v3

Real payments and the paywall, Pro upgrades, real logins (unless Question 1 picks c), sharing timelines, reels, mobile app, and support for under-13s.

## Owner to-do (not code)

These are steps only you can do, in your own accounts. Claude will say when each
one is needed.

1. **Install Tailscale** from tailscale.com (free Personal plan) and log in.
2. In the **Tailscale admin console**, turn on HTTPS certificates and allow
   Funnel for this Mac.
3. Create a **separate Anthropic API key for the live site**, and set a monthly
   spending limit on it in the Anthropic Console. A separate key can be switched
   off without affecting the local copy.
4. Put that key in `.env.production.local` as `ANTHROPIC_API_KEY`. Never paste it
   into a chat.
5. Turn on **Time Machine**, and make sure it includes `~/TrophyCaseLive`.
6. Change the **Energy settings** Claude recommends, so the Mac stays awake with
   the lid closed while plugged in.

**Not needed until the funnel goes on**, which is after Features 2, 3 and 5.
Until then the live build is tested only at `http://127.0.0.1:3100`.
