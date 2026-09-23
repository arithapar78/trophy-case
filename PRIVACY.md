# Privacy notes: Trophy Case

This app holds a child's personal information: photos of them, their school, their wins, and a record of where they were and when. That deserves care.

## The core rule: data stays on the device

Everything the user saves lives in the browser storage of the phone (or computer) they are using:

- **Achievements** and **photos** are in IndexedDB, managed by Dexie
- **There is no server database of achievements and no cloud sync.** Nothing a user writes or photographs is stored anywhere but their own device
- The website that serves the app only serves code. It never sees what anyone saves

From Phase 5 there is an account, but it holds no achievements. See below.

Because no server holds anyone's achievements or photos, there is no store of children's records to protect or to be breached. That is the whole point of the design.

## The one exception: AI

When the user turns AI on for a photo, the app sends a small copy of that photo (about 1024 px, EXIF already stripped) to `api/read-photo.ts`, a serverless function on Vercel, which passes it to the Anthropic API (Claude Haiku) and returns a draft title. The function stores nothing and logs nothing about the photo. Ranking (Phase 4) sends text only, never photos.

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

## Accounts (Phase 5): identity only

Signing in is needed for the AI features, so the API key cannot be run up by strangers and so the usage limit follows the person rather than the phone. Everything else in the app works signed out.

The server stores exactly this, and nothing else:

- a random user id
- the email address Google confirmed (or, in local development only, a typed one)
- the plan: `free` or `pro`
- when the account was made
- the sign-in tokens for that account, which expire after 90 days
- the times of the AI uses in the last 5 hours, which expire on their own
- from Phase 6, once someone has paid: the Stripe customer id and the
  subscription's status (`active`, `canceled` and so on)

That is the whole list. **No achievements, no photos, no goal, no rankings, no IP addresses, no analytics.** The records live in Upstash Redis, reached only by the serverless functions. Vercel, the host, keeps its own ordinary short-lived request logs (time, address, path) like any web host; the app adds nothing to them.

"Delete my account" in Settings removes the user, their sign-ins and their usage count from the server immediately. The achievements and photos on the device are not touched by it.

Sign-in uses Google Identity Services, which means Google sees that someone signed in to this app. Nothing about the achievements goes to Google.

### Paying (Phase 6)
Payment happens on Stripe's own page, not in this app. **No card number, expiry, CVC or billing address ever reaches this app or its server**, which is the main reason for using Stripe Checkout rather than building a payment form. What comes back is a customer id, which is a reference, not a card.

Stripe is therefore a third party that sees the payer: their card, their email and their billing country. That is unavoidable for taking money, and it is the only third party besides Anthropic (the AI) and Google (sign-in) in the whole app.

Changing a plan is one-directional on purpose: only a message from Stripe, checked against a shared secret, can move an account between Free and Pro. Nothing the app or a phone sends can do it.

### Scout and attached files (Phase 7)
Scout is a chat that already knows the goal and the achievements. Every message sends, to the same serverless function and on to Anthropic: the goal, the **words** of every achievement (never their photos), the recent part of the conversation, and any file attached to that one message. The conversation itself is kept on the device with everything else; the server stores none of it.

- A file is sent with one message and **is not stored anywhere**, not on the server and not on the device, unless the user taps Save on an achievement Scout offers
- Pictures are shrunk to about 1024 px and re-encoded before sending, which strips EXIF (where and when the photo was taken), exactly as elsewhere in the app
- Scout can never change or add anything by itself. An achievement it suggests is a card with a Save button; nothing reaches the database until that is tapped
- Attaching a transcript or a certificate means sending a real document to Anthropic. The app says what is sent, and nothing is sent unless the user attaches it

### The age check and the privacy page (Phase 8)

Accounts are for people 13 and older. Before the sign-in button appears on a device, the app asks for a birth month and year, in neutral wording that does not hint at the answer. The date is used once, in the browser, and dropped: **it is never stored or sent**. The device keeps only `passed` or `under13` in localStorage (`trophy-case.age-check`), so picking a different year afterwards does not change the answer. Under 13, sign-in is simply not offered; everything that stays on the device still works, since none of it needs an account.

The public privacy policy is `privacy.html`, a plain page that reads without the app running (Google requires one before sign-in can be opened to everyone). It is linked from Settings and next to the sign-in button. **It must say nothing this file does not. Change both in the same commit.** Contact address on it: ariquery@gmail.com.

### Categories (Phase 9)

The categories a user makes (Debate, Robotics) are stored on the device with everything else, in the settings table, and travel in backups. The photo read and Scout also send the **names** of the user's categories, so the AI picks one of theirs instead of inventing its own. Nothing else about categories leaves the device.

### The law, still

Storing an email address for a user under 13 is collecting a child's personal information, which is what COPPA (the US law), the UK Age Appropriate Design Code and GDPR-K are about. The app is meant for ages 13 and up and this is a family project, not a public service. **Before it is opened to strangers or charged for, read those rules properly and get real legal advice.** Charging money raises this further: the payer would be a parent, the user a minor, and terms and a privacy policy would have to be published and accurate. Adding sync, which would put achievements themselves on a server, is a much bigger step again and has not been agreed.

## Things to never add

- Analytics or tracking scripts
- Crash reporting that uploads app state
- Logging personal information to the console in production
- Any third-party service that is not strictly needed
