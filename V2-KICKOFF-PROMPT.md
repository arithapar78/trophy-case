# Kickoff prompt: Trophy Case v2

Read CLAUDE.md, README.md (especially "Future plan: free vs. Pro, and one shared AI assistant"), REQUIREMENTS.md, and PRIVACY.md before doing anything.

v1 is done and the AI works (it uses claude-haiku-4-5). Now I want to start v2, based on the "Future plan" section in the README.

## Step 1: Write the v2 requirements. Don't write any code yet.

Create REQUIREMENTS-v2.md in the same style as REQUIREMENTS.md: user stories, checkbox acceptance criteria I can test by hand in the browser, and a list of the tests needed. Keep the app local (localhost, SQLite, /uploads). No hosting, real accounts, or real payments yet. Fake the Free vs. Pro difference with a simple plan switch in settings so I can test both.

Put the features in this order:

1. **Plan switch (Free / Pro)**: a setting that the rest of the app checks.
2. **AI helper with a prompt limit**: one chat-style AI helper page. Free plan gets 10 prompts, and the count resets 5 hours after the first prompt of that batch. Show how many are left and when they reset. Pro gets a higher limit (suggest a number).
3. **Sort and tag achievements**: the helper suggests categories and tags, and I approve before anything changes.
4. **Edit an achievement from an upload**: the helper reads an uploaded certificate (image or PDF) and suggests a title, date, and category, and I approve before saving.
5. **LinkedIn post templates**: the helper writes a post draft from achievements I pick.
6. **College recommendations (Pro only)**: Free users see what it does and a note that it's Pro.
7. **Life plan**: the helper builds a simple plan from my achievements and goals.
8. **Choose which files the AI can see**: each upload has an "AI can read this" switch, off by default. The helper never reads a file with the switch off.
9. **Photo expiry on Free**: uploads older than 60 days get deleted on the Free plan, but the achievement stays. Show a warning and a download button starting 7 days before. Pro keeps them forever. Make the time easy to fake in tests.
10. **Avatar**: basic avatar for everyone, with extra options marked as a paid add-on (just a flag for now).

## Rules for all of this

- **Low energy AI:** use claude-haiku-4-5 everywhere, keep max_tokens as low as each job allows, send only the achievements a job needs, and cache answers to repeat questions. Only send a file to the AI when that job needs it and its switch is on.
- Keep MOCK mode working for every AI feature when there's no API key.
- Put the prompt limit and plan checks on the server, not just in the browser, so they can't be skipped.
- Update PRIVACY.md to explain that the AI can now read files I choose.
- No new libraries without asking me first.
- Parked for later, not in v2: hosting online, real logins, real payments, reels, sharing, mobile app.

## Before you finish Step 1

List any questions you have. I already know about these:
- Do Free users keep the "3 college essay ideas" button?
- What's the Pro prompt limit?
- How should "life plan" be shaped (goals and time range)?

Then **stop and wait for me to approve REQUIREMENTS-v2.md.** After I approve, build one feature at a time in the order above, following CLAUDE.md: run `npm test`, explain how to try it in the browser, commit, and wait for my OK before the next one.
