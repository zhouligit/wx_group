#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/server"

if [ -f "$SERVER/dist/main.js" ]; then
  exec node "$SERVER/dist/main.js"
fi
if [ -f "$SERVER/dist/src/main.js" ]; then
  exec node "$SERVER/dist/src/main.js"
fi

echo "API 未构建，请执行: npm run build:server" >&2
exit 1
