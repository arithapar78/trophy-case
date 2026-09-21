# Privacy notes: Trophy Case

This app holds a child's personal information: photos of them, their school, their wins, and a record of where they were and when. That deserves care.

## The core rule: data stays on the device

Everything the user saves lives in the browser storage of the phone (or computer) they are using:

- **Achievements** and **photos** are in IndexedDB, managed by Dexie
- **There is no server database, no account, and no cloud sync**
- The website that serves the app only serves code. It never sees what anyone saves

Because no server holds anyone's data, there is no database of children's records to protect or to be breached. That is the whole point of the design.

## The one exception: AI

When the user turns AI on for a photo, the app sends that photo (resized) or the text of their achievements to a small serverless function, which passes it to the Anthropic API and returns the result. The function stores nothing.

- AI is **off by default**. It is turned on per photo, or left on in Settings
- The app says in plain words, next to the toggle, that the photo will be sent to Anthropic
- Nothing is ever sent in the background

## Photos

Phone photos carry EXIF data: GPS coordinates and a timestamp, which can reveal a home address or a school. **EXIF is stripped from every photo when it is saved**, before it is stored and before it could ever be sent anywhere. Photos are also resized on save, which keeps storage small.

## Backups

The backup file is a zip of the user's records and photos. It is theirs to keep wherever they want. The app never uploads it anywhere; the user shares it using the phone's own share sheet.

## The API key

- Lives only in the serverless function's environment settings, and in a git-ignored `.env.local` for local development
- Never in the app the phone downloads, never in git
- **If a key is ever committed by accident,** treat it as compromised: delete it in the Anthropic console and make a new one. Removing it in a later commit is not enough, git keeps history
- Set a monthly spending cap in the Anthropic console so a bug can never run up a bill

## If accounts are ever added

The current design collects nothing, so COPPA (the US law about collecting data from children under 13) does not apply in the usual way. That changes the moment a server stores data for users. Before adding accounts, read up on COPPA, the UK Age Appropriate Design Code and GDPR-K, and get real legal advice. Do not host children's data without it.

## Things to never add

- Analytics or tracking scripts
- Crash reporting that uploads app state
- Logging personal information to the console in production
- Any third-party service that is not strictly needed
