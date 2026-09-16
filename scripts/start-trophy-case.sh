#!/bin/bash
#
# Starts Trophy Case and opens it in your browser.
#
# This is what the desktop launcher runs. You can also run it directly:
#   ./scripts/start-trophy-case.sh
#
# To stop the app, close the Terminal window this opens, or press Ctrl + C.

set -u

# Set PATH FIRST. A double-clicked app starts with a minimal environment that
# can lack not just node but basic tools like dirname, so everything below
# — including working out where this script lives — depends on this line.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL="http://localhost:3000"

cd "$PROJECT_DIR" || exit 1

echo "======================================"
echo "  Trophy Case"
echo "======================================"
echo ""

if ! command -v npm > /dev/null 2>&1; then
  echo "Couldn't find Node.js on this computer."
  echo ""
  echo "Trophy Case needs it to run. Install the LTS version from:"
  echo "  https://nodejs.org"
  echo ""
  echo "Then close this window and try again."
  echo ""
  read -r -p "Press Enter to close..."
  exit 1
fi

# If it's already running, just open the browser rather than starting a second one.
if curl -s -o /dev/null --max-time 2 "$URL" 2>/dev/null; then
  echo "Trophy Case is already running."
  echo "Opening $URL"
  open "$URL"
  echo ""
  echo "You can close this window."
  sleep 3
  exit 0
fi

# First run after downloading, or after someone deletes node_modules.
if [ ! -d node_modules ]; then
  echo "First time setup — installing what the app needs."
  echo "This takes a minute or two, and only happens once."
  echo ""
  npm install || { echo ""; echo "Setup failed. Please tell Claude what this window says."; read -r -p "Press Enter to close..."; exit 1; }
  echo ""
fi

# Make sure the database exists before the app tries to read it.
if [ ! -f prisma/dev.db ]; then
  echo "Setting up the database..."
  npx prisma db push > /dev/null 2>&1 || { echo "Database setup failed."; read -r -p "Press Enter to close..."; exit 1; }
  echo "Adding 8 sample achievements so it isn't empty..."
  npm run seed > /dev/null 2>&1
  echo ""
fi

echo "Starting up..."
echo ""

npm run dev &
DEV_PID=$!

# Wait for the server to answer before opening the browser, so you don't
# land on an error page.
for _ in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 1 "$URL" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

if curl -s -o /dev/null --max-time 2 "$URL" 2>/dev/null; then
  echo ""
  echo "======================================"
  echo "  Trophy Case is running"
  echo "  $URL"
  echo ""
  echo "  TO STOP: close this window,"
  echo "  or press Ctrl + C"
  echo "======================================"
  echo ""
  open "$URL"
else
  echo ""
  echo "The app didn't start in time. The messages above may say why."
  echo "Tell Claude what this window says and it can help."
  echo ""
fi

# Keep the window alive so closing it stops the app.
wait $DEV_PID
