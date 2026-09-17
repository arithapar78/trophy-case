# Requirements — Trophy Case (phone MVP)

This is the contract for the current version. If a feature isn't in this file, it doesn't get built.

**What this version is:** the smallest thing that actually works on a phone. Take a photo, add a few details, see it on your timeline. Nothing else.

**What this version is deliberately not:** there is no AI in it. The essay-ideas feature, the chat helper, plans and prompt limits were all removed to get back to a working core. They come back later, on purpose, one at a time.

Every acceptance criterion below is written so you can test it by hand on a phone and mark it pass or fail.

---

## Definitions

**Achievement** — one saved win. It has:

| Field | Required? | Rules |
|---|---|---|
| Title | Yes | 1–120 characters |
| Date | Yes | A calendar date; cannot be in the future |
| Category | Yes | Exactly one of: School, Sports, Debate, Cooking, Arts, Other |
| Note | No | Up to 500 characters |
| Photo | No | One image (JPG, PNG, WEBP, HEIC), max 10 MB |

**Photo, not "attachment".** PDFs are no longer supported. This is a camera app; if you want to save a certificate, take a picture of it.

---

## Feature 1 — It works like a phone app

> **As a student, I want** the app to feel like an app on my phone, not a website **so that** using it doesn't feel like homework.

### Acceptance criteria

- [ ] 1.1 The layout is built for a phone screen first; nothing is cut off or needs sideways scrolling on an iPhone-sized screen.
- [ ] 1.2 It can be added to the iPhone Home Screen (Share → Add to Home Screen) and gets the trophy icon.
- [ ] 1.3 Launched from the Home Screen it runs full-screen, with no Safari address bar.
- [ ] 1.4 It follows the phone's light or dark mode automatically.
- [ ] 1.5 Content is never hidden behind the notch or the home indicator.
- [ ] 1.6 Tapping a text box does not zoom the page in.
- [ ] 1.7 Every button is big enough to hit comfortably with a thumb.
- [ ] 1.8 It still works correctly in a normal desktop browser window.

---

## Feature 2 — Take a photo and save an achievement

> **As a student, I want to** photograph the thing I just did and save it in seconds **so that** the win is recorded before I forget it.

### Acceptance criteria

- [ ] 2.1 There is a large, obvious camera button at the bottom of the screen; I don't have to hunt for it.
- [ ] 2.2 On a phone, tapping it opens the camera (or offers Take Photo / Photo Library).
- [ ] 2.3 On a laptop, tapping it opens the normal file picker instead of failing.
- [ ] 2.4 After taking the photo, a details sheet slides up from the bottom.
- [ ] 2.5 The sheet shows the photo I just took, so I can see what I'm saving.
- [ ] 2.6 The sheet asks for: title, category, date, and an optional note.
- [ ] 2.7 The date defaults to today, so I can leave it alone.
- [ ] 2.8 Category is a row of tappable chips — one tap, no dropdown.
- [ ] 2.9 **The speed test:** with a stopwatch, I can save a photo achievement in under 10 seconds from tapping the camera to seeing it on the timeline.
- [ ] 2.10 There is also an "Add without a photo" option, for a win that has nothing to photograph.
- [ ] 2.11 Saving with an empty title shows an inline error and does NOT save.
- [ ] 2.12 Saving with a title longer than 120 characters shows an inline error and does NOT save.
- [ ] 2.13 Saving with a future date shows an inline error and does NOT save.
- [ ] 2.14 Saving with a note longer than 500 characters shows an inline error and does NOT save.
- [ ] 2.15 Choosing a file that isn't a photo shows a plain-English error and does NOT save.
- [ ] 2.16 Choosing a photo larger than 10 MB shows an error and does NOT save.
- [ ] 2.17 After a successful save the sheet closes and the achievement appears on the timeline without refreshing.
- [ ] 2.18 Tapping Cancel, the dimmed background, or pressing Escape closes the sheet and saves nothing.

---

## Feature 3 — The timeline

> **As a student, I want to** see all my achievements newest first **so that** my most recent wins are the first thing I see.

### Acceptance criteria

- [ ] 3.1 The home screen lists every saved achievement.
- [ ] 3.2 Achievements are sorted by date, newest first.
- [ ] 3.3 Two achievements on the same date both appear, in a stable order (the more recently created one first).
- [ ] 3.4 Each card shows: the photo if there is one, title, formatted date, category, and the note if there is one.
- [ ] 3.5 Tapping a photo opens it full size.
- [ ] 3.6 There is a category filter with all six categories plus "All".
- [ ] 3.7 Choosing a category shows only achievements in that category.
- [ ] 3.8 The category chips scroll sideways rather than wrapping and pushing the timeline down.
- [ ] 3.9 There is a search box.
- [ ] 3.10 Typing in it narrows the list to achievements whose title or note contains that text.
- [ ] 3.11 Search ignores capitalization — searching `debate` finds "Debate Finals".
- [ ] 3.12 Search and category filter work together.
- [ ] 3.13 When a filter or search matches nothing, a friendly empty message appears — not a blank screen.
- [ ] 3.14 When there are no achievements at all, the screen explains how to add the first one.
- [ ] 3.15 The camera button never covers the last card in the list.

---

## Feature 4 — Edit and delete

> **As a student, I want to** fix a typo or remove a mistake **so that** my record stays accurate.

### Acceptance criteria

- [ ] 4.1 Each card has an Edit control.
- [ ] 4.2 Tapping Edit opens the sheet pre-filled with that achievement's current values.
- [ ] 4.3 I can change any field and save, and the timeline updates immediately.
- [ ] 4.4 Editing applies the same validation rules as adding.
- [ ] 4.5 I can cancel an edit, and nothing changes.
- [ ] 4.6 I can remove the photo from an achievement, leaving the rest intact.
- [ ] 4.7 Removing a photo can be undone before saving.
- [ ] 4.8 Each card has a Delete control.
- [ ] 4.9 Tapping Delete asks me to confirm before anything is removed.
- [ ] 4.10 Confirming removes the achievement from the timeline immediately.
- [ ] 4.11 Cancelling the confirmation leaves the achievement in place.
- [ ] 4.12 A deleted achievement is still gone after I refresh.
- [ ] 4.13 Deleting an achievement also deletes its photo file from disk.

---

## Non-functional requirements

- [ ] N.1 All data is stored locally: a SQLite file and the `/uploads` folder. Nothing is sent anywhere. There are no outbound network calls at all in this version.
- [ ] N.2 `.env.local`, `/uploads`, the database file, and `node_modules` are all git-ignored.
- [ ] N.3 Works in a current version of Safari, Chrome, or Firefox.
- [ ] N.4 A photo file can never be written or read outside the uploads folder, even with a crafted filename.
- [ ] N.5 `npm test` passes.
- [ ] N.6 `npm run test:e2e` passes.
- [ ] N.7 `npm run build` completes with no TypeScript errors.

---

## Test coverage required

**Unit tests (Vitest):**

- [ ] T.1 Creating an achievement with valid data succeeds.
- [ ] T.2 Creating an achievement with invalid data (empty title, over-long title, future date, over-long note, bad category) fails with a useful message.
- [ ] T.3 Editing an achievement changes the stored values; editing with invalid data leaves the original untouched.
- [ ] T.4 Deleting an achievement removes it; deleting one that doesn't exist fails cleanly.
- [ ] T.5 Filtering by category, searching title and note case-insensitively, and the two combined all return the right rows, newest first.
- [ ] T.6 Saving a photo stores it and reports where it went.
- [ ] T.7 A HEIC photo from an iPhone is accepted.
- [ ] T.8 A PDF, a non-photo file, and a photo over 10 MB are all rejected, and nothing is written.
- [ ] T.9 A crafted filename cannot write or delete outside the uploads folder.
- [ ] T.10 The uploads folder and database path are read from the environment at call time, not frozen at import.

**End-to-end tests (Playwright, at phone size):**

- [ ] T.11 Add an achievement through the real UI and confirm it appears on the timeline and survives a reload.
- [ ] T.12 The camera button is present and wired to the phone camera.
- [ ] T.13 Edit an achievement, then delete it with confirmation, and it stays gone after a reload.
- [ ] T.14 Search and the category filter narrow the timeline together.

---

## Out of scope for this version

Anything not listed above, and specifically: **all AI features** (essay ideas, the chat helper, auto-tagging), accounts and logins, plans and payments, the live/hosted site, sharing, reels and video, LinkedIn posts, and a real native iOS app in the App Store. See "What comes next" in the README.
