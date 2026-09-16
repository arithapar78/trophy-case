# Requirements — Trophy Case v1

This is the contract for version 1. If a feature isn't in this file, it doesn't get built.

Every acceptance criterion below is written so you can test it by hand in the browser and mark it pass or fail.

---

## Definitions

**Achievement** — one saved win. It has:

| Field | Required? | Rules |
|---|---|---|
| Title | Yes | 1–120 characters |
| Date | Yes | A calendar date; cannot be in the future |
| Category | Yes | Exactly one of: School, Sports, Debate, Cooking, Arts, Other |
| Note | No | Up to 500 characters |
| Attachment | No | One image (JPG, PNG, WEBP, GIF) or one PDF, max 10 MB |

---

## Feature 1 — Add an achievement in under 10 seconds

> **As a student, I want to** save an achievement with just a title, date, and category **so that** recording a win never feels like homework.

> **As a parent, I want to** attach the certificate photo I just took **so that** the proof lives with the record.

### Acceptance criteria

- [ ] 1.1 The timeline page has a visible "Add achievement" control; I don't have to hunt for it.
- [ ] 1.2 The form shows: Title, Date, Category, Note, and a file picker.
- [ ] 1.3 Title, Date, and Category are marked as required; Note and file are clearly optional.
- [ ] 1.4 The Date field defaults to today, so I can leave it alone for something that just happened.
- [ ] 1.5 Category is a dropdown with exactly these six choices: School, Sports, Debate, Cooking, Arts, Other.
- [ ] 1.6 I can fill in only Title and Category, leave everything else at its default, click Save, and it saves.
- [ ] 1.7 Saving with an empty Title shows an inline error and does NOT save.
- [ ] 1.8 Saving with a Title longer than 120 characters shows an inline error and does NOT save.
- [ ] 1.9 Saving with a future date shows an inline error and does NOT save.
- [ ] 1.10 Saving with a Note longer than 500 characters shows an inline error and does NOT save.
- [ ] 1.11 I can attach a JPG or PNG and it saves; the file appears in the `/uploads` folder.
- [ ] 1.12 I can attach a PDF and it saves.
- [ ] 1.13 Attaching a file type that is not an image or PDF (e.g. a `.zip`) shows an error and does NOT save.
- [ ] 1.14 Attaching a file larger than 10 MB shows an error and does NOT save.
- [ ] 1.15 After a successful save, the form closes and the new achievement appears at the correct spot in the timeline without me refreshing the page.
- [ ] 1.16 **The speed test:** with a stopwatch, I can add a title-only achievement in under 10 seconds from first click to seeing it on the timeline.

---

## Feature 2 — Timeline view

> **As a student, I want to** see all my achievements newest first **so that** my most recent wins are the first thing I see.

> **As a student, I want to** filter and search **so that** I can find one specific thing among hundreds.

### Acceptance criteria

- [ ] 2.1 The home page lists every saved achievement.
- [ ] 2.2 Achievements are sorted by date, newest first.
- [ ] 2.3 Two achievements on the same date both appear, in a stable order (the more recently created one first).
- [ ] 2.4 Each row shows: title, formatted date, category, and the note if there is one.
- [ ] 2.5 If an achievement has an image attached, a thumbnail shows in the row.
- [ ] 2.6 If an achievement has a PDF attached, a labeled link shows in the row, and clicking it opens the PDF.
- [ ] 2.7 There is a category filter with all six categories plus an "All" option.
- [ ] 2.8 Choosing a category shows only achievements in that category.
- [ ] 2.9 Choosing "All" brings every achievement back.
- [ ] 2.10 There is a search box.
- [ ] 2.11 Typing in the search box narrows the list to achievements whose title or note contains that text.
- [ ] 2.12 Search ignores capitalization — searching `debate` finds "Debate Finals".
- [ ] 2.13 Search and category filter work together: filtering to Sports and searching "regional" shows only Sports achievements matching "regional".
- [ ] 2.14 When a filter or search matches nothing, a friendly empty message appears — not a blank screen.
- [ ] 2.15 When there are no achievements at all, the page explains how to add the first one.

---

## Feature 3 — Edit and delete

> **As a student, I want to** fix a typo in an achievement **so that** my record stays accurate.

> **As a student, I want to** delete something I added by mistake **so that** my timeline isn't cluttered.

### Acceptance criteria

- [ ] 3.1 Each achievement row has an Edit control.
- [ ] 3.2 Clicking Edit opens a form pre-filled with that achievement's current values.
- [ ] 3.3 I can change any field and save, and the timeline shows the updated values immediately.
- [ ] 3.4 Editing applies the same validation rules as adding (empty title, future date, and over-long note are all rejected).
- [ ] 3.5 I can cancel an edit, and nothing changes.
- [ ] 3.6 I can replace an existing attachment with a new file.
- [ ] 3.7 I can remove an attachment entirely, leaving the achievement with no file.
- [ ] 3.8 Each achievement row has a Delete control.
- [ ] 3.9 Clicking Delete asks me to confirm before anything is removed.
- [ ] 3.10 Confirming removes the achievement from the timeline immediately.
- [ ] 3.11 Cancelling the confirmation leaves the achievement in place.
- [ ] 3.12 A deleted achievement is still gone after I refresh the page.

---

## Feature 4 — AI college essay ideas

> **As a student, I want to** get essay ideas drawn from my real achievements **so that** I have a starting point instead of a blank page.

> **As a student, I want to** see which achievements each idea uses **so that** I can tell whether the idea is actually about me.

### Acceptance criteria

- [ ] 4.1 There is a clearly labeled "Give me 3 college essay ideas" button.
- [ ] 4.2 Clicking it shows a loading state so I know something is happening.
- [ ] 4.3 It returns exactly 3 ideas.
- [ ] 4.4 Each idea has a title.
- [ ] 4.5 Each idea has a one-line hook (a single sentence).
- [ ] 4.6 Each idea names which of my achievements it draws on.
- [ ] 4.7 The achievements named actually exist in my timeline — no invented ones.
- [ ] 4.8 With a valid `ANTHROPIC_API_KEY` in `.env.local`, ideas come from the real Claude API and reflect my actual achievements.
- [ ] 4.9 With no API key set, the app returns clearly-labeled MOCK sample ideas instead of erroring.
- [ ] 4.10 The UI states plainly when results are MOCK, so I never mistake samples for real output.
- [ ] 4.11 If I have zero achievements, the button explains I need to add some first instead of calling the AI.
- [ ] 4.12 If the AI call fails (bad key, no internet), I see a plain-English error message and the app keeps working.
- [ ] 4.13 My API key is never visible in the browser — it's only used on the server.

---

## Non-functional requirements

- [ ] N.1 All data is stored locally: a SQLite file and the `/uploads` folder. Nothing is sent anywhere except the achievement text sent to the Claude API when I press the essay-ideas button.
- [ ] N.2 `.env.local`, `/uploads`, the database file, and `node_modules` are all git-ignored.
- [ ] N.3 The app works in a current version of Chrome, Safari, or Firefox.
- [ ] N.4 The layout is usable on a phone-sized browser window.
- [ ] N.5 `npm test` passes.
- [ ] N.6 `npm run test:e2e` passes.
- [ ] N.7 `npm run build` completes with no TypeScript errors.

---

## Test coverage required

**Unit tests (Vitest):**

- [ ] T.1 Creating an achievement with valid data succeeds.
- [ ] T.2 Creating an achievement with invalid data (empty title, over-long title, future date, over-long note, bad category) fails with a useful message.
- [ ] T.3 Editing an achievement changes the stored values.
- [ ] T.4 Editing with invalid data fails and leaves the original untouched.
- [ ] T.5 Deleting an achievement removes it.
- [ ] T.6 Deleting an achievement that doesn't exist fails cleanly.
- [ ] T.7 Filtering by category returns only that category.
- [ ] T.8 Searching matches title text, case-insensitively.
- [ ] T.9 Searching matches note text.
- [ ] T.10 Filter and search combined return the intersection.
- [ ] T.11 The timeline returns achievements newest first.
- [ ] T.12 The essay-ideas function in MOCK mode returns exactly 3 ideas, each with a title, a hook, and referenced achievements.
- [ ] T.13 The essay-ideas function in MOCK mode references only achievements that were passed in.

**End-to-end test (Playwright):**

- [ ] T.14 Add an achievement through the real UI and confirm it appears on the timeline.

---

## Out of scope for v1

Anything not listed above, and specifically: reels/video, LinkedIn posts and profile, life planning and coaching, parent accounts, sharing, a mobile app, and payments. See "Future ideas" in the README.
