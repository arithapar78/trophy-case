# Kickoff prompt: Trophy Case v3 (live on the web, free, from this Mac)

Read CLAUDE.md, README.md, REQUIREMENTS.md, REQUIREMENTS-v2.md, REQUIREMENTS-v3.md and PRIVACY.md before doing anything. Also read the Next.js guides in `node_modules/next/dist/docs/` that cover production builds (`next build` / `next start`), environment files, cookies, route handlers and middleware/proxy. This Next.js version has breaking changes.

**The goal:** Trophy Case runs live at a public `https://` address, for free. The app runs on this Mac, and **Tailscale Funnel** gives it a public address like `trophy-case.<tailnet>.ts.net`. Anyone can use it with their own private timeline. Their data stays on this Mac and is backed up. The AI features work with 10 prompts per visitor per 5 hours.

The code also lives on GitHub (https://github.com/arithapar78/trophy-case) as the safe copy of the code. GitHub does not run the site. The paywall comes later.

**Known trade-off (accepted):** the site is only up while this Mac is awake and online. Moving to a paid host like Render later should need no code changes, only different settings.

## Step 0: Check where things stand. Don't change code yet.

1. Run `git status`, `git remote -v` and `git log --oneline -5`. The remote is named `Trophy-Case` and the branch is `main`.
2. Run `npm test` and `npm run build` and tell me the results.
3. Confirm no secrets or personal data are tracked: `git ls-files` must not include any `.env*` file except `.env.example`, any `.db` file, `/uploads` or `/backups`. Add `/backups/` to `.gitignore` if it's missing.
4. Check that I'm logged in to GitHub so you can push (`gh auth status`, or `git push --dry-run Trophy-Case main`). If not, stop and tell me exactly what to run.
5. Check whether Tailscale is installed and I'm logged in (`tailscale status`). If not, don't install anything. Tell me what to do (see "What I do by hand" below) and carry on with the parts that don't need it.
6. Commit `REQUIREMENTS-v3.md` and this prompt file, then push `main` to GitHub.

## Step 1: Update REQUIREMENTS-v3.md for the free setup

Make these edits and show me the diff before committing.

**A. Rewrite Feature 1** as "Feature 1: Live from this Mac", with testable criteria that replace the GitHub auto-deploy ones:

- **Build, don't use dev mode.** The live site runs the production build (`npm run build`, then `next start`), never `npm run dev`.
- **Its own port.** The live site uses port 3100, so it never clashes with the normal local copy on 3000.
- **Local only.** The live site listens only on this computer (`127.0.0.1`), so nobody on the Wi-Fi can reach it directly and skip the limits. The public way in is only through Tailscale Funnel.
- **Separate live data.** The live site has its own data folder outside the repo: `~/TrophyCaseLive/` with `trophy-case.db`, `uploads/` and `backups/`. My personal local copy's database and uploads are never used by, or mixed into, the live site.
  - The paths come from `DATABASE_URL`, `UPLOADS_DIR` and `BACKUPS_DIR`, set in `.env.production.local`. That file is git-ignored.
  - The defaults stay today's local paths, so `npm run dev` works exactly as before.
- **Start and stop scripts.** `scripts/start-live.sh` does the following, with plain messages like the existing launcher:
  - checks Node
  - creates the live data folder
  - creates or updates the database schema
  - builds
  - starts the app
  - turns on the funnel
  - keeps the Mac awake while it runs (`caffeinate`)

  `scripts/stop-live.sh` turns the funnel off and stops the app.
- **Updating the live site** is: pull or commit the change, then run the start script again. The README explains this.
- **Production lockdown.** The fake clock and the Free/Pro switch are hidden in the UI and refused by the server. Everyone online is on Free.
- **A README section, "Running the live site",** explains all of the above in plain steps, including how to turn the funnel off in an emergency.

**B. Replace "Open questions" with "Decisions (settled)"**, in the style of REQUIREMENTS-v2.md:

1. **Timeline across devices:** accept the limitation for now. The timeline is tied to the browser, real logins come with the paywall, and first visit says this plainly.
2. **Limits:** 10 prompts per visitor per 5 hours, 30 per network per 5 hours, 500 per day site-wide. Put the numbers in one constants file. The daily cap can be overridden with an `AI_DAILY_CAP` environment variable.
3. **Photo location data:** I approve adding `sharp` to strip hidden data (EXIF, GPS) from images. PDFs are left as-is for v3, and the Privacy page says so. No other new libraries without asking me.
4. **Inactive visitors:** data is deleted after 180 days with no visit.
5. **Host:** this Mac, with Tailscale Funnel (free). Render is the upgrade path later.
6. **Backups:**
   - The app's own backups every 6 hours into `~/TrophyCaseLive/backups`, keeping the newest 8.
   - Time Machine covers the whole `~/TrophyCaseLive` folder.
   - No other off-site backup in v3.
7. **Domain:** the free `ts.net` address from Tailscale.

**C. Update the rest of the file to match.**

- Feature 4.1 (host snapshots) becomes "Time Machine is on and includes `~/TrophyCaseLive`", checked by hand.
- Remove Render-specific wording.
- Update the Owner to-do list to match "What I do by hand" below.
- Set the Status line to approved.

## Step 2: Build, one feature at a time

Build in this order:

1. **v2 Feature 2 (AI helper with a prompt limit).** It must exist before strangers can reach the AI.
2. **v3 Feature 1: Live from this Mac**
3. **v3 Feature 2: Private space for each visitor**
4. **v3 Feature 3: Per-visitor prompt limit and cost protection**
5. **v3 Feature 4: Storage limits and backups**
6. **v3 Feature 5: Privacy and safety for a public site**

After each one, follow CLAUDE.md:

- Write the listed tests.
- Run `npm test` and `npm run build`.
- Explain in plain English what changed and how to try it.
- Commit, push to GitHub, then **wait for my OK** before starting the next one.

**Don't turn the funnel on for real** until Features 2, 3 and 5 are done. Before that, test the live build only at `http://127.0.0.1:3100`.

The rest of v2 (Features 3 to 10) comes after v3, in v2's build order.

### Things to get right

- **Storage paths.** `src/lib/uploads.ts` currently hardcodes `process.cwd()/uploads`. Make it use `UPLOADS_DIR`, with that as the default. The same goes for the database (`DATABASE_URL`, in both `prisma.config.ts` and `src/lib/db.ts`) and backups (`BACKUPS_DIR`). Check that `next start` really loads `.env.production.local`, and that the Prisma CLI commands in the start script point at the live database, not `prisma/dev.db`.
- **Visitor ID.** Use a long random value (`crypto.randomUUID()`) in a cookie with these settings:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` in production (the funnel address is `https`)

  Every database query and file read must filter by visitor ID on the server.
- **Network limit.** Find out, by testing through the funnel, which header carries the visitor's real IP address (likely `X-Forwarded-For`). Show me what you found. If no trustworthy header exists, tell me before choosing a fallback. Only trust that header when the request came through the funnel. Locally, fall back to a fixed value so tests work.
- **Backups.** Run them inside the app on a timer. Use a safe copy method (SQLite `VACUUM INTO`), so the app never has to stop. Keep the newest 8.
- **Keeping the Mac awake.** Use `caffeinate` in the start script. Tell me which macOS Energy settings to change so the Mac stays awake with the lid closed and the charger plugged in, but don't change system settings yourself.
- **Logs.** No achievement text, file contents, cookies or API key in any log, including the start script's output.
- **Native modules.** Make sure `better-sqlite3` and `sharp` work in the production build on this Mac.

## Step 3: Live-ready checklist

When all features are done:

1. Every test passes and `npm run build` is clean.
2. README.md has the "Running the live site" section: start, stop, update, emergency off, restoring from an app backup, and restoring from Time Machine.
3. PRIVACY.md describes the live version: data stored on the owner's computer, what's sent to Claude, the age check, deleting your data, and PDFs keeping their hidden data.
4. Walk me through turning the funnel on and give me the public URL.
5. Give me a "smoke test" list to click through on that URL from my phone, on cellular (not Wi-Fi):
   - two browsers see separate timelines
   - a photo upload works
   - the 10-prompt limit shows its reset time
   - "Delete all my data" works
   - the Privacy page loads
   - `http://<Mac's Wi-Fi IP>:3100` from another device does **not** work

Then stop and wait for me.

## What I do by hand (tell me when you need each one)

1. Install Tailscale from tailscale.com (free Personal plan) and log in.
2. In the Tailscale admin console, turn on HTTPS certificates and allow Funnel for this Mac.
3. Create a separate Anthropic API key for the live site, and set a monthly spending limit on it in the Anthropic Console.
4. Put that key in `.env.production.local` as `ANTHROPIC_API_KEY`. Never paste it into the chat.
5. Turn on Time Machine, and change the Energy settings you recommend.

## Rules

- Follow CLAUDE.md for everything.
- Low-energy AI rules E.1 to E.8 still apply: `claude-haiku-4-5`, the smallest `max_tokens` that works, caching, and no AI calls on page load.
- MOCK mode keeps working when there's no API key.
- Never commit `.env.local`, `.env.production.local`, databases, uploads or backups. Never print the API key.
- Don't install software or change macOS settings yourself. Tell me what to do.
- If something in this prompt conflicts with the requirements files, stop and ask.
