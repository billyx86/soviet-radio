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

PORT="${SOVIET_RADIO_PORT:-8080}"

# If $PORT is already serving, say so instead of exiting silently (issue #14):
# name the port and, best-effort, the process that owns it, so an operator can
# tell "soviet-radio is already up" from "something else owns the port".
#
# A bare 200 is not proof this app is the one answering (issue #18): any
# service on the port used to trigger "assuming soviet-radio is up". Verify
# the response carries the app's marker — the "Soviet Radio" title from
# index.html, present in both dev and production builds — before claiming
# the radio is up. A foreign service gets an explicit "NOT started" notice
# and a non-zero exit so orchestrators don't treat the no-op as success.
marker_present=0
if body=$(curl -sf --max-time 2 "http://127.0.0.1:$PORT/"); then
  case "$body" in
    *"Soviet Radio"*) marker_present=1 ;;
  esac
fi

if [ "$marker_present" = "1" ]; then
  owner_pid=""
  if command -v lsof >/dev/null 2>&1; then
    owner_pid=$(lsof -i ":$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
  elif command -v ss >/dev/null 2>&1; then
    owner_pid=$(ss -tlnp "sport = :$PORT" 2>/dev/null \
      | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)
  fi
  if [ -n "$owner_pid" ]; then
    notice="startup.sh: port $PORT is already serving soviet-radio (pid $owner_pid) - soviet-radio is already up, nothing started (issue #14)"
  else
    notice="startup.sh: port $PORT is already serving soviet-radio - soviet-radio is already up, nothing started (issue #14)"
  fi
  echo "$notice"
  # Log file may be unwritable; that must not mask the stdout notice.
  echo "$notice" >>"$LOG_FILE" 2>/dev/null || true
  exit 0
fi

if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/"; then
  owner_pid=""
  owner_name=""
  if command -v lsof >/dev/null 2>&1; then
    owner_pid=$(lsof -i ":$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
    if [ -n "$owner_pid" ]; then
      owner_name=$(lsof -i ":$PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1}')
    fi
  elif command -v ss >/dev/null 2>&1; then
    owner_pid=$(ss -tlnp "sport = :$PORT" 2>/dev/null \
      | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)
  fi
  if [ -n "$owner_pid" ] && [ -n "$owner_name" ]; then
    notice="startup.sh: port $PORT is held by an unknown service (pid $owner_pid, $owner_name) - soviet-radio was NOT started (issue #18)"
  elif [ -n "$owner_pid" ]; then
    notice="startup.sh: port $PORT is held by an unknown service (pid $owner_pid) - soviet-radio was NOT started (issue #18)"
  else
    notice="startup.sh: port $PORT is held by an unknown service - soviet-radio was NOT started (issue #18)"
  fi
  echo "$notice" >&2
  echo "$notice" >>"$LOG_FILE" 2>/dev/null || true
  exit 1
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
  # Port passed on the CLI so SOVIET_RADIO_PORT overrides the 8080 baked
  # into package.json / vite.config.ts (default behavior unchanged).
  npx vite preview --host 0.0.0.0 --port "$PORT" >>"$LOG_FILE" 2>&1 &
else
  npx vite --host 0.0.0.0 --port "$PORT" >>"$LOG_FILE" 2>&1 &
fi

# Wait briefly for the server to bind
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/"; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done

echo "Server did not become ready; see $LOG_FILE" >&2
exit 1
