#!/bin/bash
#
# Stops the LIVE Trophy Case site.
#
#   ./scripts/stop-live.sh
#
# Turns the funnel off first (so nobody can reach a half-stopped site), then
# stops the app and lets the Mac sleep normally again.

set -u

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

LIVE_PORT=3100
LIVE_DIR="$HOME/TrophyCaseLive"
PID_FILE="$LIVE_DIR/live.pid"
CAFFEINATE_PID_FILE="$LIVE_DIR/caffeinate.pid"

echo "=========================================="
echo "  Stopping the live site"
echo "=========================================="
echo ""

# --- Funnel off first ---
if command -v tailscale > /dev/null 2>&1; then
  echo "1/3  Turning the public address off..."
  tailscale funnel --https=443 off > /dev/null 2>&1
  tailscale serve --https=443 off > /dev/null 2>&1
  echo "     The site is no longer reachable from the internet."
else
  echo "1/3  Tailscale isn't installed, so there's no public address to turn off."
fi
echo ""

# --- Stop the app ---
echo "2/3  Stopping the app..."
STOPPED=no

if [ -f "$PID_FILE" ]; then
  APP_PID="$(cat "$PID_FILE")"
  if kill "$APP_PID" 2>/dev/null; then
    STOPPED=yes
  fi
  rm -f "$PID_FILE"
fi

# Catch anything still holding the port, in case the pid file was stale.
if lsof -ti tcp:"$LIVE_PORT" > /dev/null 2>&1; then
  lsof -ti tcp:"$LIVE_PORT" | xargs kill 2>/dev/null
  STOPPED=yes
fi

if [ "$STOPPED" = yes ]; then
  echo "     Stopped."
else
  echo "     It wasn't running."
fi
echo ""

# --- Let the Mac sleep ---
echo "3/3  Letting this Mac sleep normally again..."
if [ -f "$CAFFEINATE_PID_FILE" ]; then
  kill "$(cat "$CAFFEINATE_PID_FILE")" 2>/dev/null
  rm -f "$CAFFEINATE_PID_FILE"
fi
# Catch any caffeinate this script started earlier and lost track of.
pkill -f "caffeinate -dimsu" 2>/dev/null
echo "     Done."
echo ""

echo "The live site is stopped. Your personal copy on port 3000 is unaffected."
echo ""
