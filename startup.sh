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

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
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
