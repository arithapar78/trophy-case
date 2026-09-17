#!/bin/bash
#
# Starts the LIVE Trophy Case site — the public one.
#
#   ./scripts/start-live.sh
#
# What this does:
#   - checks Node is installed
#   - makes sure the live data folder exists
#   - sets up the live database
#   - builds the production version
#   - starts it on port 3100, reachable only from this Mac
#   - keeps the Mac awake while it runs
#
# It does NOT turn the funnel on yet. That happens once the privacy features
# are built — see REQUIREMENTS-v3.md.
#
# To stop it: ./scripts/stop-live.sh, or close this window.

set -u

# Set PATH first. A script launched from outside a terminal can start with a
# minimal environment that lacks even basic tools.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

LIVE_PORT=3100
LIVE_HOST=127.0.0.1
LIVE_DIR="$HOME/TrophyCaseLive"
PID_FILE="$LIVE_DIR/live.pid"
CAFFEINATE_PID_FILE="$LIVE_DIR/caffeinate.pid"

echo "=========================================="
echo "  Trophy Case — LIVE site"
echo "=========================================="
echo ""

# --- Node ---
if ! command -v npm > /dev/null 2>&1; then
  echo "Couldn't find Node.js on this computer."
  echo ""
  echo "Install the LTS version from https://nodejs.org, then try again."
  exit 1
fi

# --- Already running? ---
if curl -s -o /dev/null --max-time 2 "http://$LIVE_HOST:$LIVE_PORT" 2>/dev/null; then
  echo "The live site is already running at http://$LIVE_HOST:$LIVE_PORT"
  echo ""
  echo "To restart it with your latest changes:"
  echo "  ./scripts/stop-live.sh"
  echo "  ./scripts/start-live.sh"
  exit 0
fi

# --- Settings file ---
if [ ! -f .env.production.local ]; then
  echo "There's no .env.production.local file yet."
  echo ""
  echo "That file tells the live site where to keep its data, separately from"
  echo "your personal copy. To create it:"
  echo ""
  echo "  cp .env.production.example .env.production.local"
  echo ""
  echo "Then open it and add your API key for the live site (or leave it blank"
  echo "to run without AI costs)."
  exit 1
fi

# --- Live data folder ---
echo "1/5  Checking the live data folder..."
mkdir -p "$LIVE_DIR/uploads" "$LIVE_DIR/backups"
echo "     $LIVE_DIR"
echo ""

# Read the live database location out of the settings file, so the schema is
# applied to the LIVE database and never to your personal one.
LIVE_DATABASE_URL="$(grep -E '^DATABASE_URL=' .env.production.local | head -1 | cut -d= -f2- | tr -d '"'"'"'')"

if [ -z "$LIVE_DATABASE_URL" ]; then
  echo "     Couldn't find DATABASE_URL in .env.production.local."
  echo "     Add a line like:"
  echo '       DATABASE_URL="file:'"$LIVE_DIR"'/trophy-case.db"'
  exit 1
fi

case "$LIVE_DATABASE_URL" in
  *prisma/dev.db*)
    echo "     STOPPING: DATABASE_URL points at prisma/dev.db, which is your"
    echo "     personal database. The live site must use its own."
    echo "     Change it in .env.production.local to something under $LIVE_DIR"
    exit 1
    ;;
esac

# --- Database schema ---
echo "2/5  Setting up the live database..."
if ! npx prisma db push --url="$LIVE_DATABASE_URL" > /dev/null 2>&1; then
  echo "     That didn't work. Running it again so you can see why:"
  npx prisma db push --url="$LIVE_DATABASE_URL"
  exit 1
fi
echo "     Ready."
echo ""

# --- Build ---
echo "3/5  Building the production version..."
echo "     (takes a few seconds)"
if ! npm run build > /tmp/trophy-case-build.log 2>&1; then
  echo ""
  echo "     The build failed. The last few lines were:"
  tail -20 /tmp/trophy-case-build.log
  exit 1
fi
echo "     Built."
echo ""

# --- Keep the Mac awake ---
echo "4/5  Keeping this Mac awake while the site runs..."
caffeinate -dimsu &
echo $! > "$CAFFEINATE_PID_FILE"
echo "     Done. It will sleep normally again once you stop the site."
echo ""

# --- Start ---
echo "5/5  Starting the site..."
NODE_ENV=production npx next start --hostname "$LIVE_HOST" --port "$LIVE_PORT" &
APP_PID=$!
echo "$APP_PID" > "$PID_FILE"

# Wait for it to answer before declaring success.
for _ in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 1 "http://$LIVE_HOST:$LIVE_PORT" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

if curl -s -o /dev/null --max-time 2 "http://$LIVE_HOST:$LIVE_PORT" 2>/dev/null; then
  echo ""
  echo "=========================================="
  echo "  The live site is running"
  echo "  http://$LIVE_HOST:$LIVE_PORT"
  echo ""
  echo "  This is reachable ONLY from this Mac."
  echo "  It is not on the internet yet."
  echo ""
  echo "  Data folder: $LIVE_DIR"
  echo ""
  echo "  TO STOP: ./scripts/stop-live.sh"
  echo "=========================================="
  echo ""
else
  echo ""
  echo "     The site didn't start in time."
  echo "     Tell Claude what this window says and it can help."
  echo ""
fi

wait "$APP_PID"
