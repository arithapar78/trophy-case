# Requirements: Trophy Case

This is the contract. If a feature is not in this file, it does not get built. Phases are built in order, one at a time, and each phase is done only when its tests pass and it has been tried on a phone.

**The rule under everything:** the user's data stays on the device they are using. No server database of achievements, no uploads. Signing in creates an account that holds only who you are, your plan, and your AI usage count. The app is a static web page that runs on the phone.

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

**AI use**: one call to the AI. A photo read, a ranking refresh, or a recommendations refresh. Free allows 10 per rolling 5 hours, counted on the server, against your account.

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
- [ ] 7.10 Each AI use counts against a limit of 10 per rolling 5 hours, counted on the server. Settings and the sheet show how many are left and when the next one frees up.
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

Ideas raised 2026-09-23, not agreed: public portfolios anyone can see, and an Explore page of other people's portfolios. Both would put a child's achievements on a server for strangers, which breaks the core rule in PRIVACY.md and needs legal advice (COPPA) and a plan for moderation first. A smaller version to think about: a private link to one portfolio, sent only to chosen people and switchable off.

---

## Phase 5: Accounts (identity only)

**The rule still holds:** achievements and photos stay on the device. An account is only who you are, your plan, and your AI usage count. Nothing about your achievements is stored on the server. Signing in is needed for the AI features so the API key cannot be run up by strangers; everything else works signed out.

### Feature 10: Sign in with Google

> **As a student, I want to** sign in with one tap and no password, **so that** the AI knows it is me and my limit follows me.

- [ ] 10.1 Settings has "Continue with Google". Tapping it signs in with the phone's Google account and shows the email signed in as.
- [ ] 10.2 Signed in, Settings has "Sign out". Signing out keeps every achievement on the device.
- [ ] 10.3 Signed out, the AI buttons (photo read, rank, recommend) are replaced by a "Sign in to use AI" message with a button that opens Settings. Saving, editing, backup and export all work signed out.
- [ ] 10.4 The sign-in survives closing and reopening the app.
- [ ] 10.5 The server stores only: a user id, the email, the plan, when the account was made, and the timestamps of AI uses in the last 5 hours.
- [ ] 10.6 With no Google client id configured (local development), Settings shows a clearly labelled test-mode sign-in that takes any email. It is refused on the live site.
- [ ] 10.7 Settings has "Delete my account", with a confirmation. It removes the user from the server. The achievements on the device are untouched.

### Feature 11: The limit lives on the server

- [ ] 11.1 Each AI function checks the sign-in token, refuses without one, and counts the use against the account: 10 per rolling 5 hours on Free, 100 on Pro.
- [ ] 11.2 At the limit the function refuses with a message saying when the next use frees up, and the app shows it.
- [ ] 11.3 Every AI answer includes how many uses are left, and the app shows that number instead of counting on the device.
- [ ] 11.4 Clearing the app's data on the phone does not reset the limit.

### Phase 5 tests

- [ ] T5.1 Unit: a session token that does not exist, or has expired, is refused; a valid one returns the user.
- [ ] T5.2 Unit: the server-side counter allows 10 uses for Free and 100 for Pro in a 5-hour window, refuses the next, and frees a slot after 5 hours.
- [ ] T5.3 Unit: each AI function refuses a request with no token, and counts one use on success and none on a refused request.
- [ ] T5.4 Unit: deleting an account removes the user, their sessions and their usage.
- [ ] T5.5 E2E: signed out, the AI panel says to sign in and makes no AI request. Test-mode sign-in, then the AI works and the remaining count comes from the server.
- [ ] T5.6 E2E: sign out keeps the achievements; sign-in survives a reload.

---

## Phase 6: Pro plan

**The rule still holds:** achievements and photos stay on the device. Paying adds a Stripe customer id and a plan to the account, nothing else. Card details never touch this app: the payment happens on Stripe's own page.

**Who pays.** The Stripe account belongs to an adult. A student on a family phone is expected to have a parent do the upgrade.

### Feature 12: Upgrade to Pro

> **As a parent, I want to** pay $10 a month, **so that** my child is not stopped by the AI limit in the middle of an application.

- [ ] 12.1 Signed in on Free, Settings shows a Pro block: $10 a month, 100 AI uses per rolling 5 hours instead of 10, cancel any time. It has an "Upgrade to Pro" button.
- [ ] 12.2 Tapping it opens Stripe's own payment page. The app never sees or stores a card number.
- [ ] 12.3 After paying, Stripe returns to the app and Settings shows Pro and the new limit. If the plan has not arrived yet, Settings says it is still confirming rather than showing the wrong plan.
- [ ] 12.4 If the payment is abandoned or fails, returning to the app leaves the account on Free with no error shouted at the user.
- [ ] 12.5 Signed out, there is no upgrade offer. Settings asks for a sign-in first.
- [ ] 12.6 On Pro, Settings replaces the upgrade button with "Manage subscription", which opens Stripe's own portal to change the card or cancel.
- [ ] 12.7 After cancelling, the account stays Pro until the paid period ends, then returns to Free and the limit returns to 10.
- [ ] 12.8 With no Stripe keys configured (local development), Settings shows a clearly labelled MOCK upgrade that flips the plan with no payment. It is refused on the live site.

### Feature 13: The plan decides the limit

- [ ] 13.1 Free allows 10 AI uses per rolling 5 hours, Pro allows 100. The server decides, from the plan on the account.
- [ ] 13.2 The plan lives on the server. Clearing the app, or signing in on a different phone, keeps Pro.
- [ ] 13.3 Only a verified message from Stripe changes a plan. The app can never set its own plan, and no request from a phone can.
- [ ] 13.4 A message claiming to be from Stripe with a missing, wrong or stale signature is refused and changes nothing.
- [ ] 13.5 The same Stripe message arriving twice changes the account once.
- [ ] 13.6 On top of what Phase 5 stores, the server keeps only the Stripe customer id and the subscription status. No card number, no expiry, no billing address.

### Phase 6 tests

- [ ] T6.1 Unit: a webhook with a correct signature is accepted; a wrong signature, a missing header, and a timestamp older than the tolerance are each refused with a 400 and no plan change.
- [ ] T6.2 Unit: `checkout.session.completed` sets the plan to pro and stores the Stripe customer id; `customer.subscription.deleted` sets it back to free.
- [ ] T6.3 Unit: the same event id delivered twice leaves the account in the same state as delivering it once.
- [ ] T6.4 Unit: on Pro the server allows 100 uses in a 5-hour window and refuses the 101st.
- [ ] T6.5 Unit: a checkout request with no sign-in token is refused.
- [ ] T6.6 E2E: signed out there is no upgrade offer; signed in on Free the offer appears, the MOCK upgrade flips Settings to Pro with the higher limit, and the achievements on the device are untouched by upgrading.

### Not code, but required before charging real money

- [ ] 6.a The Stripe account is activated (bank, legal name, tax details). Until then only test cards work.
- [ ] 6.b Vercel is on a paid plan. Hobby is for non-commercial use only.
- [ ] 6.c Terms and a privacy policy are published and linked from Settings, and a lawyer has read them. The customers are parents and the users are minors.

---

## Phase 7: AI for everyone, and Scout

**Why the limit is going.** A counter that runs out after ten tries reads as a paywall, and a paywall in front of someone who has not seen the app work yet sends them away. Until there are real users there is nothing to sell, so there is no reason to meter anything. The Stripe code from Phase 6 stays exactly where it is, switched off.

### Feature 14: Nothing to count

> **As a student, I want to** use the AI as much as I need, **so that** I am not rationing it while I am still working out what the app is for.

- [ ] 14.1 No use counter appears anywhere in the app: not in Settings, not on the AI panel, not on the Ranked view.
- [ ] 14.2 The server still counts, quietly, against a ceiling high enough that no real person reaches it. It is a circuit breaker against a script hammering the public functions, not a product limit.
- [ ] 14.3 If the ceiling is ever reached, the message says it is a safety limit and when it clears. It never mentions paying.
- [ ] 14.4 The Pro offer is hidden and nothing in the app sells anything. Every line of Stripe code from Phase 6 stays and keeps passing its tests; setting `ENABLE_PRO` on the server brings the offer back with no code change.
- [ ] 14.5 Signing in is still required for AI. That is what keeps the functions from being anonymous and free to abuse.

### Feature 15: Scout

> **As a student, I want to** talk to something that already knows my goal and everything I have done, **so that** I can ask what to do next in my own words instead of tapping buttons.

- [ ] 15.1 A third tab sits next to Timeline and Ranked, called **Scout**.
- [ ] 15.2 Typing a message and sending it gets a written answer that takes the goal and the achievements into account. One AI use per message.
- [ ] 15.3 Scout stays on subject: the student's achievements, their goal, and how to get from one to the other. Asked about anything else it says that is not what it is for and steers back.
- [ ] 15.4 The conversation is kept on the device and is still there after closing and reopening the app.
- [ ] 15.5 "Clear this conversation" empties it after a confirmation. The achievements are untouched.
- [ ] 15.6 With no goal set, Scout says a goal would help and offers a button to Settings, and still answers questions about the achievements.
- [ ] 15.7 With no achievements saved, Scout says the timeline is empty and suggests adding one.
- [ ] 15.8 Scout uses Claude Haiku, the same model as the rest of the app, because it is the cheapest and lightest that can do the job.
- [ ] 15.9 Scout works in MOCK mode with no API key, like every other AI feature.
- [ ] 15.10 While waiting for an answer the app says so, and a failure is a message a 14-year-old understands, not an error code.

### Feature 16: Bringing a file into the conversation

> **As a student, I want to** show Scout my transcript or a certificate, **so that** I do not have to type out what is already in a document.

- [ ] 16.1 An attach button opens whatever the device offers: on a phone that is the photo library, the camera and Files; on a computer it is the ordinary file picker.
- [ ] 16.2 Images, PDFs and plain text files are accepted. Anything else is refused with a plain message naming what it does take.
- [ ] 16.3 Images are resized to about 1024 px and have their EXIF stripped before sending, exactly like photos elsewhere in the app.
- [ ] 16.4 A file is sent with that one message and is not saved anywhere. Nothing about it stays on the server.
- [ ] 16.5 If Scout finds an achievement in the file or the conversation, it offers it as a card with the fields already filled in. **Nothing is saved until the user taps Save.**
- [ ] 16.6 Saving adds it to the timeline like any other achievement. Discarding leaves nothing behind.
- [ ] 16.7 A file too big to send is refused before anything is sent, with a message saying how big is too big.

### Phase 7 tests

- [ ] T7.1 Unit: every account gets the same limit, and the limit is high enough that the number is not a product decision.
- [ ] T7.2 Unit: with `ENABLE_PRO` unset the server reports that billing is unavailable; with it set the Phase 6 behaviour returns unchanged.
- [ ] T7.3 Unit: Scout's prompt contains the goal and every achievement's words, and never a photo.
- [ ] T7.4 Unit: MOCK Scout answers, and a reply carrying a proposed achievement is parsed into a valid draft; a malformed one is ignored rather than crashing.
- [ ] T7.5 Unit: a file type that is not an image, a PDF or plain text is refused, and so is one over the size cap.
- [ ] T7.6 E2E: the Scout tab sends a message, shows the answer, and the conversation survives a reload.
- [ ] T7.7 E2E: a proposed achievement is not saved until Save is tapped, and Discard leaves the timeline unchanged.
- [ ] T7.8 E2E: no use counter appears anywhere, and Settings offers nothing to buy.

---

## Phase 8: A privacy policy, and 13 or older to sign in

**Why now.** To let anyone sign in with Google (not just the test users added by hand), Google needs a public privacy policy link. And the account stores an email address, which for a child under 13 is exactly what COPPA is about. Both have to be in place before strangers can sign in.

### Feature 17: The privacy policy page

> **As a parent, I want to** read in plain words what this app keeps and sends, **so that** I can decide whether my kid should use it.

- [ ] 17.1 A page at `/privacy.html` says in plain English: what stays on the device, the exact list of what the server stores, what goes to Anthropic (AI) and Google (sign-in) and when, how to delete everything, that accounts are for ages 13 and up, a contact email, and the date it was last changed.
- [ ] 17.2 It opens from a plain link without signing in and without the app running, so a parent or Google's reviewers can read it.
- [ ] 17.3 It is linked from Settings and next to the sign-in button.
- [ ] 17.4 Once the app is installed it opens with no signal, like the rest of the app.
- [ ] 17.5 It says nothing PRIVACY.md does not. When one changes, the other changes in the same commit.

### Feature 18: 13 or older to make an account

> **As the person running this app, I want** only people 13 and up to make an account, **so that** it does not collect a child's email address.

- [ ] 18.1 The first time someone goes to sign in on a device, the app asks for their birth month and year. The question is neutral: it does not say what answer lets you in.
- [ ] 18.2 13 or older: sign-in appears as normal, and the question is not asked again on that device.
- [ ] 18.3 Under 13: sign-in is not offered. The message says the AI features need an account and accounts are for 13 and up, and that everything else in the app works. Going back and picking a different year does not change the answer on that device.
- [ ] 18.4 The birth month and year are never stored or sent anywhere. The device keeps only "passed" or "under 13".
- [ ] 18.5 Saving, editing, the timeline, backup and export all still work for everyone, signed in or not. Nothing leaves the device without an account, so they need no age check.

### Phase 8 tests

- [ ] T8.1 Unit: the age check passes someone who turned 13 last month, refuses someone who turns 13 next month, and treats a birth month and year that cannot be real (the future, over 120 years ago) as not answered.
- [ ] T8.2 E2E: `/privacy.html` loads on its own, and the links from Settings and from the sign-in area open it.
- [ ] T8.3 E2E: under 13, no sign-in is offered and that is still true after a reload; 13 and up, sign-in appears and the question is not asked again.
- [ ] T8.4 E2E: the birth month and year appear in no request and nowhere in the device's storage.

---

## Phase 9: Categories that fit everyone

**Why.** The categories were Ari's (Debate, Cooking). A broad starting list fits most students, and anyone can add the ones that are theirs.

### Feature 19: A broad starting list

- [ ] 19.1 Everyone starts with: School, Sports, Arts, Community Service, Work, Clubs & Leadership, Awards, Other.
- [ ] 19.2 On a phone that already has achievements, any category in use that is not on the new list (Debate, Cooking) becomes one of that user's own categories automatically. No achievement changes category and nothing is lost.

### Feature 20: Your own categories

> **As a student, I want to** add a category that fits what I do, **so that** my timeline is organised my way.

- [ ] 20.1 The category picker in the details sheet has "+ New category". Typing a name and saving adds it and picks it.
- [ ] 20.2 Settings lists your own categories. Each can be renamed (every achievement in it follows) or deleted (its achievements move to Other, after a confirmation saying how many).
- [ ] 20.3 A name is 1 to 30 characters and cannot repeat an existing one, ignoring capitals. Up to 20 of your own.
- [ ] 20.4 The timeline filter shows All plus every category that has at least one achievement, so the row does not fill up with empty ones.
- [ ] 20.5 The AI (photo read and Scout) picks from your full list, your own categories included, and never invents one.
- [ ] 20.6 Backups carry your own categories; restoring adds any that are missing.

### Phase 9 tests

- [ ] T9.1 Unit: validation accepts starter and custom categories and refuses an unknown one; names are trimmed, length-checked and de-duplicated ignoring capitals.
- [ ] T9.2 Unit: the database upgrade turns Debate and Cooking into custom categories and leaves every achievement's category as it was.
- [ ] T9.3 Unit: renaming moves every achievement; deleting moves them to Other.
- [ ] T9.4 Unit: the photo-read and Scout prompts list the user's categories, and an AI answer naming a category not on the list falls back to Other.
- [ ] T9.5 E2E: add a category from the details sheet, save into it, filter by it, rename it, delete it.
- [ ] T9.6 E2E: a backup with a custom category restores it on a fresh device.

---

## Phase 10: The Me tab

### Feature 21: Who you are, on one page

> **As a student, I want to** see everything I have done on one page, with a short honest read on who that makes me, **so that** I know where I stand.

- [ ] 21.1 A fourth tab, **Me**, next to Timeline, Ranked and Scout.
- [ ] 21.2 At the top, an AI summary: a short paragraph in the second person ("You're someone who...") and three to five strengths, each backed by the achievements that show it. It is written only from the achievements (and the goal, if there is one), and does not invent anything.
- [ ] 21.3 The summary is written only when the user taps "Write my summary" (one AI use). It is kept on the device, shows the date it was written, and says when achievements have been added or changed since, with a "Refresh" button. Never written in the background.
- [ ] 21.4 Below it, every achievement on one page, grouped by category with a count for each, newest first, compact: title, date, and result or role if there is one. Tapping one opens it.
- [ ] 21.5 A line of totals at the top of the list: how many achievements, how many categories, and the span of dates.
- [ ] 21.6 The list works signed out and offline. Signed out, the summary area asks for a sign-in, like the other AI features.
- [ ] 21.7 MOCK mode with no key, clearly labelled.
- [ ] 21.8 The top of the Me tab is a **profile card**: the summary and strengths (once written), the totals, and a small chart of how many achievements are in each category. It looks designed, not like a form.
- [ ] 21.9 "Save as image" turns the card into a picture (PNG, portrait, sized for a phone and for posting) and opens the share sheet, or downloads it on a computer. Drawn by the app itself with no new library. Nothing is uploaded to make it.

### Phase 10 tests

- [ ] T10.1 Unit: the summary prompt holds the achievements' words and the goal and never a photo; a malformed answer is refused rather than shown.
- [ ] T10.2 Unit: grouping, counts, totals and "changed since the summary" are right, including with no achievements.
- [ ] T10.3 E2E: the Me tab lists everything grouped, writes a MOCK summary on tap, keeps it after a reload, and offers Refresh after an achievement is added.
- [ ] T10.4 E2E: signed out, the list shows and the summary asks for a sign-in; no AI request is made.
- [ ] T10.5 E2E: "Save as image" produces a PNG of the card, with or without a summary, and makes no network request.

---

## Phase 11: Scout can suggest edits

### Feature 22: Change many achievements by asking

> **As a student, I want to** say "add Middlesex Magic to all my basketball achievements" **so that** I do not have to open each one.

- [ ] 22.1 Asked to change achievements, Scout answers with a list of proposed changes: which achievement, which field, the old value and the new one.
- [ ] 22.2 The list shows as a card. Each change can be unticked. **Nothing changes until Confirm is tapped.** Cancel leaves everything as it was.
- [ ] 22.3 After confirming, an Undo button puts back exactly what changed, until the next confirmed change.
- [ ] 22.4 Scout can change the text fields and the category. It cannot delete an achievement, touch photos, or add more than 50 changes at once.
- [ ] 22.5 Every new value goes through the same validation as the form. A change that would fail it is dropped and the card says so.
- [ ] 22.6 If an achievement was edited between the suggestion and Confirm, that change is skipped rather than overwriting the newer text, and the card says so.
- [ ] 22.7 MOCK mode proposes a sample change, so the flow can be tested without a key.

**Technical note.** The model refers to achievements by their number in the prompt (1, 2, 3), not by their long ids, for the same reason as the ranking fix: a copied id with one wrong character silently drops that achievement.

### Phase 11 tests

- [ ] T11.1 Unit: a reply with a change list is parsed; unknown numbers, unknown fields, invalid values, more than 50 changes and malformed blocks are each dropped without crashing.
- [ ] T11.2 Unit: applying changes updates only the ticked ones, skips any whose old value no longer matches, and Undo restores exactly the old values.
- [ ] T11.3 E2E: a MOCK edit proposal changes nothing until Confirm; Cancel changes nothing; Confirm changes the timeline; Undo reverses it.

---

## Phase 12: A welcome, and what's new

Built before Phase 11, at Vishal's request.

### Feature 23: Hello when you open the app

> **As a student, I want to** be greeted by name and told what's new when I open the app, **so that** it feels like mine and I find the new things without hunting.

- [ ] 23.1 The first time the app opens on a device, a welcome card appears: "Hi there", one line on what Trophy Case is, and a few short steps on how it works (snap a photo, it lands on your timeline, set a goal, ask Scout).
- [ ] 23.2 The welcome asks "What should we call you?". It is optional. Up to 30 characters. The name is kept on the device only: it is never sent to the AI or the server and is not in backups. It is used only for the greeting.
- [ ] 23.3 After an update that has something new, the next open shows "Hi (name), here's what's new" with a short list of what changed. The how-it-works steps are still there, folded under "How it works".
- [ ] 23.4 It shows once per update. "Let's go" (or "Got it"), the X, or Escape closes it and it does not come back until the next update with something new.
- [ ] 23.5 Settings has "What's new and how it works", which opens the same card at any time. The name can be changed there.
- [ ] 23.6 Works signed out and offline, and makes no network request.
- [ ] 23.7 Fits an iPhone screen with the main button in thumb reach; scrolls if the list is long. It looks designed, not like a form.

**Technical note.** The list of what's new lives in `src/lib/welcome.ts` with an id. Changing the id is what makes the card show again, so each update that adds something visible gets a new id and a new list. What was last seen and the name live in the settings table (`whatsNewSeen`, `name`). "Delete everything" clears both, so the welcome shows again after it.

### Phase 12 tests

- [ ] T12.1 Unit: a brand new device gets the welcome; a device that saw an older list gets what's new; a device that saw this list gets nothing. A device with achievements but nothing seen (people who had the app before Phase 12) gets what's new, not the first-time welcome.
- [ ] T12.2 Unit: the name is trimmed, extra spaces are squeezed, it is cut to 30 characters, and an empty name means "Hi there".
- [ ] T12.3 E2E: a fresh device shows the welcome; typing a name and tapping Let's go closes it; after a reload it does not come back; Settings reopens it greeting by name; no network request is made.
- [ ] T12.4 E2E: a device that saw an older list shows what's new, greeted by name, and the X closes it for good.
