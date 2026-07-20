#!/bin/sh
set -eu
cd "$(dirname "$0")"

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev >>/tmp/soviet-radio.log 2>&1 &

# Wait briefly for the server to bind
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done

echo "Server did not become ready; see /tmp/soviet-radio.log" >&2
exit 1
