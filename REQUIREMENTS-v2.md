# Requirements — Trophy Case v2

The contract for version 2. Same rule as v1: if a feature isn't in this file, it doesn't get built.

Every acceptance criterion is written so you can test it by hand in the browser and mark it pass or fail.

**v2 stays local.** localhost, SQLite, `/uploads`. No hosting, no real accounts, no real payments. Free vs. Pro is faked with a plan switch in settings so both can be tested.

**Still parked, not in v2:** hosting online, real logins, real payments, reels/video, sharing, mobile app.

---

## What carries over from v1

Everything in [REQUIREMENTS.md](REQUIREMENTS.md) still applies. v2 adds to it and must not break it:

- Adding an achievement stays under 10 seconds (v1 criterion 1.16)
- The timeline, filter, search, edit and delete all keep working
- The existing "Give me 3 college essay ideas" button keeps working

---

## Definitions

**Plan** — either `Free` or `Pro`. Stored in settings, one per app (there are no accounts in v2).

**The helper** — one chat-style AI page that does all the smart jobs. Every AI job in v2 goes through it.

**Prompt** — one message you send to the helper that reaches the Claude API. A cached answer does **not** count.

**Prompt window** — the 5-hour period that starts at your first prompt after a reset.

**AI-readable** — a per-upload switch. Off by default. The helper never reads a file with this off.

---

## Plan limits

| | Free | Pro |
|---|---|---|
| Prompts | 10 per 5-hour window | 100 per 5-hour window |
| College recommendations | No | Yes |
| Uploaded files | Deleted after 60 days | Kept |
| Avatar | Basic | Basic + paid extras (flagged only) |
| Everything from v1 | Yes | Yes |

The Pro number is a **proposal** — see Open Questions.

---

## Feature 1 — Plan switch (Free / Pro)

> **As someone testing this, I want to** flip between Free and Pro **so that** I can see both experiences without paying for anything.

### Acceptance criteria

- [ ] 1.1 There is a Settings page reachable from the timeline.
- [ ] 1.2 Settings shows which plan is active.
- [ ] 1.3 I can switch between Free and Pro.
- [ ] 1.4 The plan survives a page refresh.
- [ ] 1.5 The plan survives restarting the app.
- [ ] 1.6 Settings says plainly that this is a test switch, not a real subscription.
- [ ] 1.7 Switching to Pro immediately raises the prompt limit shown on the helper page.
- [ ] 1.8 Switching to Free immediately lowers it.
- [ ] 1.9 The plan is stored on the server, not just in the browser.
- [ ] 1.10 Changing the plan never deletes or alters any achievement.

---

## Feature 2 — AI helper with a prompt limit

> **As a student, I want to** ask the helper for things in one place **so that** I don't have to learn a different screen for every AI feature.

> **As the person paying the API bill, I want** a hard limit on prompts **so that** a runaway loop can't cost me real money.

### Acceptance criteria

**The page**

- [ ] 2.1 There is a Helper page reachable from the timeline.
- [ ] 2.2 I can type a message and send it.
- [ ] 2.3 My message appears in the conversation straight away.
- [ ] 2.4 A loading state shows while the helper is thinking.
- [ ] 2.5 The reply appears in the conversation.
- [ ] 2.6 The conversation stays put when I navigate away and come back.
- [ ] 2.7 There is a way to clear the conversation.

**The limit**

- [ ] 2.8 The page always shows prompts used and prompts remaining.
- [ ] 2.9 On Free, the limit is 10.
- [ ] 2.10 On Pro, the limit is higher (see Open Questions).
- [ ] 2.11 Each prompt that reaches the API reduces the remaining count by exactly 1.
- [ ] 2.12 At 0 remaining, the send button is disabled and explains why.
- [ ] 2.13 At 0 remaining, the page shows the exact time the count resets.
- [ ] 2.14 The window starts at the **first** prompt of a batch, not at midnight or at app start.
- [ ] 2.15 Five hours after that first prompt, the count resets to the full limit.
- [ ] 2.16 Sending a request straight to the API endpoint (bypassing the browser) is **also** refused when the limit is used up.
- [ ] 2.17 A failed prompt (API error) does **not** consume one of my prompts.
- [ ] 2.18 There is a documented way to fake the clock in tests, so I don't have to wait 5 hours.

**Caching**

- [ ] 2.19 Asking the exact same question twice returns the second answer without using a prompt.
- [ ] 2.20 A cached answer is labelled so I know it wasn't freshly generated.
- [ ] 2.21 Changing my achievements invalidates cached answers that depended on them.

**MOCK mode**

- [ ] 2.22 With no API key, the helper still replies with clearly-labelled sample answers.
- [ ] 2.23 MOCK replies do not consume prompts (no API call is made).

---

## Feature 3 — Sort and tag achievements

> **As a student, I want** the helper to suggest better categories and tags **so that** my timeline gets tidier without me sorting it by hand.

> **As a student, I want to** approve every change first **so that** the AI can't quietly rewrite my record.

### Acceptance criteria

- [ ] 3.1 There is a "Tidy up my achievements" action in the helper.
- [ ] 3.2 It shows suggestions as a list: which achievement, what it says now, what it would become.
- [ ] 3.3 **Nothing changes until I approve it.**
- [ ] 3.4 I can approve suggestions one at a time.
- [ ] 3.5 I can approve all at once.
- [ ] 3.6 I can reject a suggestion, and that achievement stays exactly as it was.
- [ ] 3.7 Approved changes show on the timeline immediately.
- [ ] 3.8 Suggested categories are always one of the six allowed ones.
- [ ] 3.9 Tags are saved and shown on the achievement.
- [ ] 3.10 I can remove a tag by hand afterwards.
- [ ] 3.11 It only sends the achievements it needs, not the whole history.
- [ ] 3.12 It uses one prompt, not one per achievement.
- [ ] 3.13 It works in MOCK mode with sample suggestions.
- [ ] 3.14 Suggestions only ever reference achievements that exist.

---

## Feature 4 — Edit an achievement from an upload

> **As a student, I want to** upload a certificate and have the helper fill in the details **so that** I don't retype what's already printed on it.

### Acceptance criteria

- [ ] 4.1 From an achievement with an attachment, there is a "Read this file and suggest details" action.
- [ ] 4.2 It works on an image (JPG, PNG, WEBP, GIF).
- [ ] 4.3 It works on a PDF.
- [ ] 4.4 It suggests a title, a date, and a category.
- [ ] 4.5 Each suggestion sits next to the current value so I can compare.
- [ ] 4.6 **Nothing is saved until I approve it.**
- [ ] 4.7 I can accept some suggestions and reject others.
- [ ] 4.8 Rejecting everything leaves the achievement untouched.
- [ ] 4.9 The suggested date is never in the future (same rule as v1).
- [ ] 4.10 The suggested category is one of the six.
- [ ] 4.11 If the file's AI-readable switch is **off**, the action is unavailable and says why.
- [ ] 4.12 If the helper can't read the file, it says so plainly instead of inventing details.
- [ ] 4.13 It works in MOCK mode with sample suggestions and sends no file.
- [ ] 4.14 The file is only sent for this job, not attached to other prompts.

---

## Feature 5 — LinkedIn post templates

> **As a student, I want** a draft post about something I did **so that** I have a starting point instead of a blank box.

### Acceptance criteria

- [ ] 5.1 There is a "Write a LinkedIn post" action in the helper.
- [ ] 5.2 I choose which achievements it uses.
- [ ] 5.3 I must pick at least one; it explains this rather than failing silently.
- [ ] 5.4 It produces a draft post.
- [ ] 5.5 The draft only mentions achievements I picked.
- [ ] 5.6 There is a copy button.
- [ ] 5.7 I can ask for a different version without re-picking the achievements.
- [ ] 5.8 It only sends the picked achievements, not all of them.
- [ ] 5.9 It works in MOCK mode with a sample post.
- [ ] 5.10 The draft is plain text I can paste anywhere — no markdown formatting characters.

---

## Feature 6 — College recommendations (Pro only)

> **As a Pro user, I want** college suggestions based on what I've actually done **so that** I get a starting list to research.

> **As a Free user, I want to** see what the feature does **so that** I can decide whether it's worth upgrading.

### Acceptance criteria

- [ ] 6.1 The feature is visible to everyone in the helper.
- [ ] 6.2 On Free, it is clearly marked as Pro and cannot be run.
- [ ] 6.3 On Free, it explains in one line what it would do.
- [ ] 6.4 On Pro, it runs.
- [ ] 6.5 It suggests colleges with a one-line reason tied to my achievements.
- [ ] 6.6 Each reason names achievements that actually exist.
- [ ] 6.7 It says plainly that these are starting points to research, not predictions or advice.
- [ ] 6.8 A Free user calling the API endpoint directly is **also** refused.
- [ ] 6.9 Switching Free → Pro makes it available without restarting the app.
- [ ] 6.10 It works in MOCK mode (on Pro) with sample suggestions.

---

## Feature 7 — Life plan

> **As a student, I want** a simple plan built from what I've done and what I want **so that** I can see a next step instead of a blank future.

### Acceptance criteria

- [ ] 7.1 There is a "Build me a plan" action in the helper.
- [ ] 7.2 I can type one or more goals.
- [ ] 7.3 I can choose a time range (see Open Questions for the options).
- [ ] 7.4 It produces a plan with a small number of concrete steps.
- [ ] 7.5 Steps connect to achievements I already have where relevant.
- [ ] 7.6 It says plainly this is a suggestion, not advice from a counsellor.
- [ ] 7.7 With no goals typed, it asks for one rather than guessing.
- [ ] 7.8 The plan is saved so I can look at it again without spending another prompt.
- [ ] 7.9 I can delete a saved plan.
- [ ] 7.10 It works in MOCK mode with a sample plan.

---

## Feature 8 — Choose which files the AI can see

> **As a parent, I want** files to be private from the AI unless I say otherwise **so that** nothing about my kid is sent anywhere by accident.

### Acceptance criteria

- [ ] 8.1 Every upload has an "AI can read this" switch.
- [ ] 8.2 It is **off by default**, including for files uploaded in v1.
- [ ] 8.3 The switch is visible on the achievement without hunting for it.
- [ ] 8.4 I can turn it on and off at any time.
- [ ] 8.5 The setting survives a refresh.
- [ ] 8.6 With the switch off, the helper never receives that file — verified by checking what's sent, not just the UI.
- [ ] 8.7 With it off, actions needing the file are unavailable and say why.
- [ ] 8.8 Turning it off after a job has run stops the file being sent again.
- [ ] 8.9 The server enforces this, so a crafted request can't bypass it.
- [ ] 8.10 There is a single place to see every file currently readable by the AI.
- [ ] 8.11 The switch explains, in one line, what turning it on means.

---

## Feature 9 — Photo expiry on Free

> **As a Free user, I want** clear warning before a photo is deleted **so that** I can save it first.

> **As a student, I want** the achievement itself to survive **so that** my record has a gap in evidence, not a missing win.

### Acceptance criteria

- [ ] 9.1 On Free, an uploaded file is deleted 60 days after upload.
- [ ] 9.2 **The achievement itself is never deleted** — only the file.
- [ ] 9.3 After deletion, the achievement shows that a file used to be attached and when it went.
- [ ] 9.4 From 7 days before, a warning shows on that achievement.
- [ ] 9.5 The warning says exactly which day the file goes.
- [ ] 9.6 The warning includes a download button.
- [ ] 9.7 The download gives me the original file with its original name.
- [ ] 9.8 On Pro, files are never deleted and no warning appears.
- [ ] 9.9 Switching Free → Pro stops a pending deletion.
- [ ] 9.10 Switching Pro → Free restarts the clock from the original upload date, and a file already past 60 days warns rather than vanishing instantly.
- [ ] 9.11 There is a documented way to fake the clock so this is testable in minutes, not months.
- [ ] 9.12 Deletion removes the file from `/uploads`, not just the database row.
- [ ] 9.13 There is a list of files expiring soon.

---

## Feature 10 — Avatar

> **As a student, I want** a picture that represents me **so that** the app feels like mine.

### Acceptance criteria

- [ ] 10.1 There is a basic avatar, available on both plans.
- [ ] 10.2 I can choose from a small built-in set.
- [ ] 10.3 The choice survives a refresh.
- [ ] 10.4 The avatar shows somewhere visible.
- [ ] 10.5 Extra options are shown but marked as a paid add-on.
- [ ] 10.6 Paid extras cannot be selected — this is a flag only, with no payment anywhere in v2.
- [ ] 10.7 It is clear that paid extras are separate from Pro.

---

## Low-energy AI rules

These apply to **every** AI feature. The project targets an energy-efficient host, so waste is a bug.

- [ ] E.1 Every AI call uses `claude-haiku-4-5`.
- [ ] E.2 Each job sets `max_tokens` to the smallest value that does the job.
- [ ] E.3 Each job sends only the achievements it needs.
- [ ] E.4 No job sends a file unless that job needs it **and** the file's switch is on.
- [ ] E.5 Repeat questions are served from cache without an API call.
- [ ] E.6 The system prompt is stable enough to be cacheable across calls.
- [ ] E.7 No AI call is made when MOCK mode is active.
- [ ] E.8 No AI call happens without a deliberate user action — nothing on page load.

---

## Non-functional requirements

- [ ] N2.1 Everything stays local: SQLite, `/uploads`, localhost.
- [ ] N2.2 Plan checks and prompt limits are enforced **on the server**, so the browser can't skip them.
- [ ] N2.3 The API key is never visible in the browser (v1 criterion 4.13 still holds).
- [ ] N2.4 Every v1 test still passes.
- [ ] N2.5 `npm run build` completes with no TypeScript errors.
- [ ] N2.6 The layout works at phone width.
- [ ] N2.7 PRIVACY.md explains that the AI can now read files you choose.
- [ ] N2.8 No new libraries without asking first.
- [ ] N2.9 Existing achievements and files survive the upgrade — v2 doesn't wipe v1 data.

---

## Tests required

**Unit (Vitest)**

- [ ] T2.1 The plan saves and loads.
- [ ] T2.2 Free and Pro return their correct limits.
- [ ] T2.3 Counting a prompt reduces remaining by 1.
- [ ] T2.4 The limit blocks an 11th prompt on Free.
- [ ] T2.5 The window resets exactly 5 hours after the first prompt (fake clock).
- [ ] T2.6 The window does **not** reset at 4 hours 59 minutes.
- [ ] T2.7 A failed API call doesn't consume a prompt.
- [ ] T2.8 A cache hit returns without an API call and without consuming a prompt.
- [ ] T2.9 Changing an achievement invalidates the cache entries that used it.
- [ ] T2.10 Tag suggestions only reference achievements that exist.
- [ ] T2.11 Suggested categories are always one of the six.
- [ ] T2.12 Approving a suggestion changes the achievement; rejecting leaves it alone.
- [ ] T2.13 File-reading is refused when the AI-readable switch is off.
- [ ] T2.14 A file with the switch on is included; with it off, it is absent from what's sent.
- [ ] T2.15 Suggested dates are never in the future.
- [ ] T2.16 A LinkedIn draft only uses the picked achievements.
- [ ] T2.17 College recommendations are refused on Free at the server.
- [ ] T2.18 College recommendations run on Pro.
- [ ] T2.19 A life plan needs at least one goal.
- [ ] T2.20 A saved plan can be re-read without an API call.
- [ ] T2.21 Expiry deletes the file but keeps the achievement (fake clock).
- [ ] T2.22 A file at 53 days produces a warning; at 52 days it doesn't.
- [ ] T2.23 Pro files are never expired.
- [ ] T2.24 Expiry removes the file from disk.
- [ ] T2.25 Every AI job runs in MOCK mode with no key.
- [ ] T2.26 Every AI job uses `claude-haiku-4-5`.
- [ ] T2.27 Avatar choice saves and loads.

**End-to-end (Playwright)**

- [ ] T2.28 Switch to Pro in settings and see the higher limit on the helper page.
- [ ] T2.29 Send a prompt to the helper and see the remaining count drop.
- [ ] T2.30 Approve a tag suggestion and see the timeline update.
- [ ] T2.31 Turn a file's AI switch on, then off, and see the action become unavailable.
- [ ] T2.32 A Free user sees college recommendations marked as Pro and can't run them.

---

## Decisions (settled 2026-09-16)

These were open questions; all are now answered and built to.

1. **Free users keep the v1 "3 college essay ideas" button.** It costs one prompt
   from the same allowance. Removing a feature that already shipped free would
   feel like a takeaway.

2. **Pro prompt limit is 100 per 5-hour window.** High enough to feel unlimited
   in normal use, low enough that a runaway loop can't quietly cost real money.

3. **Life plan:** free-text goals, plus a time range of 3 months / 1 year /
   3 years. Each plan produces 3-5 concrete steps.

4. **Tags are free-text, up to 5 per achievement.** A fixed list would be tidier
   but can't describe a real kid's life. Near-duplicates ("soccer" vs "football")
   are an accepted cost.

5. **The v1 essay-ideas button stays where it is** and keeps working as it does
   now. Two doors to a similar thing, but it's already built and tested.

6. **The fake clock is a dev-only control in Settings** that shifts the app's
   idea of "now" forward. Hidden in production. Used for both the 5-hour prompt
   window and the 60-day file expiry.

7. **The helper conversation persists across app restarts**, saved to the
   database, with a clear button.

## Build order

Features are built in this order, which is the list order with **one change**:
Feature 8 moves ahead of Feature 4.

    1 -> 2 -> 3 -> 8 -> 4 -> 5 -> 6 -> 7 -> 9 -> 10

**Why the change:** criterion 4.11 requires the "read this file" action to be
unavailable when a file's AI switch is off. That switch is Feature 8. Building
8 first means the switch and its server-side enforcement ship as one complete,
tested feature before anything is able to read a file — rather than a partial
switch being bolted onto Feature 4 and finished later.
