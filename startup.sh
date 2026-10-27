#!/bin/sh
set -eu
cd "$(dirname "$0")"

# Log path is configurable (issue #9); keeps the historical default.
LOG_FILE="${SOVIET_RADIO_LOG:-/tmp/soviet-radio.log}"

# Server mode (issue #9):
#   auto (default)  production build if dist/ exists or can be built, else dev
#   dev             always the Vite dev server (hot reload)
#   prod            always the production build (vite preview); fail if it
#                   cannot be built
MODE="${SOVIET_RADIO_MODE:-auto}"

PORT=8080

# If 8080 is already serving, say so instead of exiting silently (issue #14):
# name the port and, best-effort, the process that owns it, so an operator can
# tell "soviet-radio is already up" from "something else owns 8080".
if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/"; then
  owner_pid=""
  if command -v lsof >/dev/null 2>&1; then
    owner_pid=$(lsof -i ":$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
  elif command -v ss >/dev/null 2>&1; then
    owner_pid=$(ss -tlnp "sport = :$PORT" 2>/dev/null \
      | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)
  fi
  if [ -n "$owner_pid" ]; then
    notice="startup.sh: port $PORT is already in use (pid $owner_pid) - assuming soviet-radio is up, nothing started (issue #14)"
  else
    notice="startup.sh: port $PORT is already in use - assuming soviet-radio is up, nothing started (issue #14)"
  fi
  echo "$notice"
  # Log file may be unwritable; that must not mask the stdout notice.
  echo "$notice" >>"$LOG_FILE" 2>/dev/null || true
  exit 0
fi

if [ ! -d node_modules ]; then
  npm install
fi

run_prod=0
if [ "$MODE" = "prod" ] || [ "$MODE" = "auto" ]; then
  if [ ! -d dist ] && ! npm run build >>"$LOG_FILE" 2>&1; then
    if [ "$MODE" = "prod" ]; then
      echo "Production build failed; see $LOG_FILE" >&2
      exit 1
    fi
    echo "Auto mode: production build failed; using dev server; see $LOG_FILE" >&2
  else
    run_prod=1
  fi
fi

if [ "$run_prod" = "1" ]; then
  npm run preview >>"$LOG_FILE" 2>&1 &
else
  npm run dev >>"$LOG_FILE" 2>&1 &
fi

# Wait briefly for the server to bind
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done

echo "Server did not become ready; see $LOG_FILE" >&2
exit 1
