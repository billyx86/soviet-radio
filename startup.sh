#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if curl -sf -o /dev/null http://127.0.0.1:8080/; then
  echo "Dev server already running on :8080"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Soviet Radio on 0.0.0.0:8080..."
npm run dev
