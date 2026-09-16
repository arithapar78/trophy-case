# Privacy notes — Trophy Case

This app is designed to hold a child's personal information: their name, their school, photos of them, their test scores, and a record of where they were and when. That deserves care.

## The core rule for v1: data stays local

Everything lives on your own computer:

- **Achievements** are in a SQLite database file at `prisma/dev.db`.
- **Photos and PDFs** are in the `/uploads` folder.
- **There is no server, no account, and no cloud sync.** Nothing is uploaded anywhere.

The one exception: when you press "Give me 3 college essay ideas," the **text** of your achievements (titles, dates, categories, notes) is sent to the Claude API to generate ideas. **Your uploaded photos and PDFs are never sent.** If you don't want even the text to leave your machine, leave `ANTHROPIC_API_KEY` blank and the app runs in MOCK mode with no network calls at all.

## Never commit these

These are in `.gitignore`. Keep them there.

| What | Why |
|---|---|
| `.env.local` | Holds your real API key. A committed key can be found and used by anyone, and you pay for it. |
| `/uploads` | Photos of a child. These must never end up in a git repo, which is often public and always permanent. |
| `prisma/dev.db` | The whole achievement history, including names and schools. |
| `node_modules` | Not a privacy issue — just huge and rebuildable. |

**If you ever commit a secret by accident:** treat the key as compromised. Go to the Anthropic Console, delete that key, and create a new one. Removing it in a later commit is not enough — git keeps the history.

## Photos deserve extra thought

Photos of children carry more than the picture. Many phone photos include GPS coordinates and a timestamp in their EXIF data, which can reveal a home address or a school. In v1 the files never leave your machine, so this is fine. **Before this app is ever shared or hosted, EXIF data should be stripped from uploads.**

## If this ever goes public: COPPA

Version 1 is a single-user local app, so COPPA doesn't apply. That changes completely if a hosted version collects data from children under 13.

The US Children's Online Privacy Protection Act would then require, among other things:

- **Verifiable parental consent** before collecting any personal information from a child under 13 — a real verification step, not a checkbox.
- **A clear privacy policy** saying what's collected, how it's used, and who it's shared with.
- **Parental access rights** — a parent can review their child's data, delete it, and refuse further collection.
- **Data minimization** — collect only what the feature genuinely needs.
- **Reasonable security** for everything collected.
- **Retention limits** — don't keep the data longer than it's needed for.

Similar rules apply elsewhere: the UK's Age Appropriate Design Code and GDPR-K in the EU, which sets the consent age between 13 and 16 depending on the country.

**Practical takeaway:** don't host a multi-user version of this app for under-13s without proper legal advice. That is a much bigger project than the MVP, and getting it wrong carries real penalties.

## Things to avoid adding

- Analytics or tracking scripts that see a child's data.
- Crash reporting that uploads app state.
- Logging personal information to the console or a log file in production.
- Any third-party service that isn't strictly needed.
