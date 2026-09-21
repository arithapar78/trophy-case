# Requirements: Trophy Case

This is the contract. If a feature is not in this file, it does not get built. Phases are built in order, one at a time, and each phase is done only when its tests pass and it has been tried on a phone.

**The rule under everything:** the user's data stays on the device they are using. No server database, no accounts, no uploads. The app is a static web page that runs on the phone.

Every acceptance criterion is written so it can be tested by hand on a phone and marked pass or fail.

---

## Definitions

**Achievement**: one saved win. It has:

| Field | Required? | Rules |
|---|---|---|
| Title | Yes | 1 to 120 characters |
| Date | Yes | A calendar date; cannot be in the future |
| Category | Yes | Exactly one of: School, Sports, Debate, Cooking, Arts, Other |
| Note | No | Up to 500 characters |
| Organisation | No | Up to 80 characters. The team, club, school or company |
| Role | No | Up to 80 characters. Captain, member, volunteer |
| Result | No | Up to 80 characters. 1st place, 95%, finalist |
| Photos | No | 0 to 5 images (JPG, PNG, WEBP, HEIC), each max 10 MB before resize. The first is the cover |

**Photo, not "attachment".** This is a camera app. To save a certificate, take a picture of it.

**AI use**: one call to the AI. A photo read, a ranking refresh, or a recommendations refresh. Free allows 10 per rolling 5 hours, counted on the device.

**Goal**: one sentence the user sets, up to 200 characters, that the AI ranks against. Example: "get into a top engineering school".

---

## Phase 0: The restart (this commit)

- [ ] 0.1 The repo contains only the new harness (CLAUDE.md, REQUIREMENTS.md, README.md, PRIVACY.md), an empty Vite + React + TypeScript + Tailwind app, Dexie installed, and the test tools wired up.
- [ ] 0.2 `npm test` runs and passes at least one unit test.
- [ ] 0.3 `npm run build` completes with no TypeScript errors.
- [ ] 0.4 `npm run dev` opens a page that says "Trophy Case" at http://localhost:5173.
- [ ] 0.5 `.gitignore` excludes `node_modules`, `dist`, `.env.local`, and Playwright output.

---

## Phase 1: The core, on the device

### Feature 1: It works like a phone app

> **As a student, I want** the app to feel like an app on my phone, not a website, **so that** using it does not feel like homework.

- [ ] 1.1 The layout is built for a phone screen first; nothing is cut off or needs sideways scrolling on an iPhone-sized screen.
- [ ] 1.2 It follows the phone's light or dark mode automatically.
- [ ] 1.3 Content is never hidden behind the notch or the home indicator.
- [ ] 1.4 Tapping a text box does not zoom the page in.
- [ ] 1.5 Every button is big enough to hit comfortably with a thumb (at least 44 by 44 points).
- [ ] 1.6 It still works in a normal desktop browser window.

### Feature 2: Save an achievement, two ways

> **As a student, I want to** photograph the thing I just did and save it in seconds, **so that** the win is recorded before I forget it.

> **As a student, I want to** write down a win with no photo, **so that** things with nothing to photograph still count.

- [ ] 2.1 There is a large, obvious camera button at the bottom of the screen.
- [ ] 2.2 On a phone, tapping it opens the camera (or offers Take Photo / Photo Library).
- [ ] 2.3 On a laptop, tapping it opens the normal file picker.
- [ ] 2.4 After choosing a photo, a details sheet slides up from the bottom showing the photo.
- [ ] 2.5 The sheet asks for: title, category, date, and optional note, organisation, role, result. The optional fields are collapsed under "More details" so the sheet stays short.
- [ ] 2.6 The date defaults to today.
- [ ] 2.7 Category is a row of tappable chips, one tap, no dropdown.
- [ ] 2.8 I can add up to 4 more photos from the sheet. The first is the cover. I can remove any photo before saving.
- [ ] 2.9 There is an "Add without a photo" option that opens the same sheet with no photo.
- [ ] 2.10 **The speed test:** with a stopwatch, I can save a photo achievement in under 10 seconds from tapping the camera to seeing it on the timeline.
- [ ] 2.11 Saving with an empty title shows an inline error and does not save.
- [ ] 2.12 Saving with a title over 120 characters, a note over 500, or an optional field over 80 shows an inline error and does not save.
- [ ] 2.13 Saving with a future date shows an inline error and does not save.
- [ ] 2.14 Choosing a file that is not a photo shows a plain-English error and does not save.
- [ ] 2.15 Choosing a photo over 10 MB shows an error and does not save.
- [ ] 2.16 Every photo is resized to at most 1600 px on its long side and has its EXIF data removed before it is stored.
- [ ] 2.17 After a successful save the sheet closes and the achievement appears on the timeline without refreshing.
- [ ] 2.18 Tapping Cancel, the dimmed background, or pressing Escape closes the sheet and saves nothing.
- [ ] 2.19 The saved achievement is still there after closing and reopening the browser tab.

### Feature 3: The timeline

> **As a student, I want to** see all my achievements newest first, **so that** my most recent wins are the first thing I see.

- [ ] 3.1 The home screen lists every saved achievement.
- [ ] 3.2 Sorted by date, newest first; same date, the more recently created one first.
- [ ] 3.3 Each card shows: the cover photo if there is one, a count if there are more photos, title, formatted date, category, organisation and result if set, and the note if there is one.
- [ ] 3.4 Tapping a photo opens it full size, and I can swipe between an achievement's photos.
- [ ] 3.5 There is a category filter with all six categories plus "All", scrolling sideways.
- [ ] 3.6 There is a search box that matches title, note, organisation, role and result, ignoring capitalisation.
- [ ] 3.7 Search and the category filter work together.
- [ ] 3.8 When a filter or search matches nothing, a friendly empty message appears.
- [ ] 3.9 When there are no achievements at all, the screen explains how to add the first one.
- [ ] 3.10 The camera button never covers the last card in the list.

### Feature 4: Edit and delete

> **As a student, I want to** fix a typo or remove a mistake, **so that** my record stays accurate.

- [ ] 4.1 Each card has an Edit control that opens the sheet pre-filled.
- [ ] 4.2 I can change any field, add or remove photos, and save; the timeline updates immediately.
- [ ] 4.3 Editing applies the same validation rules as adding.
- [ ] 4.4 I can cancel an edit and nothing changes, including photos I removed during the edit.
- [ ] 4.5 Each card has a Delete control that asks me to confirm.
- [ ] 4.6 Confirming removes the achievement and its photos; cancelling leaves it in place.
- [ ] 4.7 A deleted achievement is still gone after a reload.

### Phase 1 tests

**Unit (Vitest):**

- [ ] T1.1 Valid achievement data passes validation; each invalid case (empty title, over-long title, future date, over-long note, over-long optional field, bad category, more than 5 photos) fails with a useful message.
- [ ] T1.2 Creating, editing and deleting an achievement through `src/lib/` works against a test database; editing with invalid data leaves the original untouched; deleting one that does not exist fails cleanly.
- [ ] T1.3 Listing returns newest first with the same-date tiebreak; category filter, search across all text fields ignoring case, and the two combined return the right rows.
- [ ] T1.4 A photo is resized so its long side is at most 1600 px, and its EXIF data is gone afterwards.
- [ ] T1.5 A non-image file and a file over 10 MB are rejected before anything is stored.
- [ ] T1.6 Deleting an achievement removes its photo records too.

**End-to-end (Playwright, iPhone viewport):**

- [ ] T1.7 Add an achievement with a photo through the real UI; it appears on the timeline and survives a reload.
- [ ] T1.8 Add one without a photo.
- [ ] T1.9 Edit an achievement, then delete it with confirmation; it stays gone after a reload.
- [ ] T1.10 Search and the category filter narrow the timeline together.
- [ ] T1.11 The camera button is present and wired to the phone camera (`capture` attribute on the file input).

---

## Phase 2: On your phone

### Feature 5: Install from a URL

> **As a student, I want to** open a URL on my phone and add it to my Home Screen, **so that** it is a real app icon I tap every day.

- [ ] 5.1 The app is deployed to an https URL on a free static host, from the GitHub repo, on every push to `main`.
- [ ] 5.2 On iPhone Safari, Share then Add to Home Screen installs it with the trophy icon and the name "Trophy Case".
- [ ] 5.3 On Android Chrome, the browser offers to install it.
- [ ] 5.4 Launched from the Home Screen it runs full screen with no address bar.
- [ ] 5.5 With the phone in airplane mode, the installed app still opens and shows the timeline, and saving still works.
- [ ] 5.6 The app asks the browser for persistent storage on first save, so the phone does not clear the data.
- [ ] 5.7 When a new version is deployed, the installed app picks it up on next launch without losing data.

### Feature 6: Backup and restore

> **As a parent, I want to** keep a copy of everything, **so that** a lost phone does not mean a lost record.

- [ ] 6.1 Settings has "Back up everything". It produces one zip file containing a JSON file of all achievements and every photo, and opens the phone's share sheet so it can go to iCloud, Drive, AirDrop or email.
- [ ] 6.2 Settings has "Restore from backup". Choosing a zip imports its achievements and photos.
- [ ] 6.3 Restoring merges by achievement id: importing the same backup twice does not create duplicates.
- [ ] 6.4 Restoring a file that is not a Trophy Case backup shows a plain-English error and changes nothing.
- [ ] 6.5 Settings has "Delete everything" with a confirmation that requires typing DELETE. Confirming wipes all achievements and photos on the device.
- [ ] 6.6 Settings shows how much storage the app is using.

### Phase 2 tests

- [ ] T2.1 Unit: a backup built from a set of achievements contains them all and their photos; restoring it into an empty database recreates them exactly; restoring it twice leaves the count unchanged.
- [ ] T2.2 Unit: a zip without the expected manifest is rejected with a clear message.
- [ ] T2.3 E2E: the page has a valid web app manifest and a registered service worker, and the timeline loads with the network turned off in Playwright.
- [ ] T2.4 E2E: back up, delete everything, restore, and the achievements are back.

---

## Phase 3: AI reads the photo

### Feature 7: AI photo read, off by default

> **As a student, I want** the app to look at my photo and fill in the title for me, **so that** saving is even faster.

- [ ] 7.1 AI is off by default. Nothing is ever sent without the user turning it on.
- [ ] 7.2 Every time the details sheet opens with a photo, it shows a button "Let AI fill this in", with one plain sentence beside it saying the photo will be sent to Anthropic and not stored there.
- [ ] 7.3 Settings has a switch "Always let AI read my photos", which skips the button and runs the read as soon as a photo is chosen.
- [ ] 7.4 When AI runs, the sheet shows a loading state, then fills title, category, a date guess and a one-line note as a draft. Nothing saves until the user taps Save.
- [ ] 7.5 The user can change anything in the draft before saving.
- [ ] 7.6 The photo is resized to about 1024 px before it is sent.
- [ ] 7.7 The API key lives only in a serverless function on the host. The app the phone downloads contains no key.
- [ ] 7.8 With no key set on the function, it returns a clearly labelled MOCK draft, and the sheet says so.
- [ ] 7.9 If the call fails (no signal, bad key), the sheet shows a plain-English message and the user can still fill it in by hand.
- [ ] 7.10 Each AI use counts against a limit of 10 per rolling 5 hours, counted on the device. Settings and the sheet show how many are left and when the next one frees up.
- [ ] 7.11 At the limit, the AI button is disabled with a message saying when it comes back. Saving by hand still works.

### Phase 3 tests

- [ ] T3.1 Unit: the usage counter allows 10 uses in a 5-hour window, refuses the 11th, and frees a slot exactly 5 hours after the first use.
- [ ] T3.2 Unit: the function's MOCK mode returns a draft with title, category (one of the six), date and note, and never calls the network.
- [ ] T3.3 Unit: the function rejects a request with no image, and an image over the size limit.
- [ ] T3.4 E2E: with AI off, choosing a photo makes no network request to the AI function.
- [ ] T3.5 E2E: tapping "Let AI fill this in" against the MOCK function fills the draft and the sheet shows the MOCK label.

---

## Phase 4: Goal, ranking, recommendations, export

### Feature 8: Goal and ranking

> **As a student, I want to** know which of my achievements matter most for what I am aiming at, **so that** I know what to put first on an application.

- [ ] 8.1 Settings has a Goal field, one sentence up to 200 characters, stored on the device.
- [ ] 8.2 The timeline has a second view, "Ranked", available once a goal is set.
- [ ] 8.3 Tapping "Rank my achievements" sends the titles, categories, dates, notes and optional fields (never photos) plus the goal to the AI, and stores a rank and a one-line reason per achievement. This is one AI use.
- [ ] 8.4 The Ranked view lists achievements by rank with the reason under each.
- [ ] 8.5 Ranks are kept until the user asks to rank again. Adding an achievement shows it as "not ranked yet"; nothing runs automatically.
- [ ] 8.6 Tapping "What should I do next?" returns three suggested achievements with a sentence each on why, for the same goal. One AI use. They are shown on the Ranked view and kept until refreshed.
- [ ] 8.7 With no goal set, both buttons explain that a goal is needed first.
- [ ] 8.8 With no achievements, ranking explains there is nothing to rank yet.
- [ ] 8.9 Both features work in MOCK mode and count against the same 10-per-5-hours limit.

### Feature 9: Export

> **As a student, I want to** hand my counselor a clean list, **so that** the record is useful outside the app.

- [ ] 9.1 Settings has "Export as PDF". It produces a one-column PDF: title, date, category, organisation, role, result, note, newest first, no photos, with the goal at the top if set.
- [ ] 9.2 Settings has "Export as text". Same content as plain text, opened in the share sheet.
- [ ] 9.3 Export works offline and uses no AI.

### Phase 4 tests

- [ ] T4.1 Unit: MOCK ranking returns a rank for every achievement passed in and none that were not, each with a reason.
- [ ] T4.2 Unit: MOCK recommendations return exactly three items with a reason each.
- [ ] T4.3 Unit: the text export contains every achievement, newest first, and the goal when set.
- [ ] T4.4 E2E: set a goal, rank against MOCK, and the Ranked view shows the reasons.

---

## Non-functional requirements (all phases)

- [ ] N.1 All user data is stored on the device in IndexedDB. Nothing is sent anywhere except to the AI function, only when the user turns AI on.
- [ ] N.2 No analytics, tracking, crash reporting or third-party scripts.
- [ ] N.3 Works in current Safari on iOS, Chrome on Android, and desktop Chrome, Safari and Firefox.
- [ ] N.4 `npm test`, `npm run test:e2e` and `npm run build` all pass with no TypeScript errors.
- [ ] N.5 `.env.local`, `node_modules`, `dist` and test output are git-ignored.

---

## Later (not now)

Written down so they are not forgotten, in this order:

1. **Accounts and sync**: sign in with a magic link, Apple or Google, so a timeline follows the user across devices. Needed before Pro so limits cannot be reset by clearing the app.
2. **Pro plan**: $10/month through Stripe, 100 AI uses per 5 hours instead of 10.
3. **The assistant** (Pro only): chat about your record, and plain-English bulk edits ("edit all my basketball achievements to say I also played for Middlesex Magic") that always show the changes and ask for confirmation before saving.
4. **Extra categories**: Volunteering, Work, Clubs, Awards, once the user decides.
5. **App store wrappers**: Amazon Appstore and Apple App Store around this same web app.

Also parked: sharing, reels and video, LinkedIn posts, cloud backup beyond the share sheet.
