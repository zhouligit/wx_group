#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/web"

VITE="$ROOT/apps/web/node_modules/.bin/vite"
[ -x "$VITE" ] || VITE="$ROOT/node_modules/.bin/vite"

exec "$VITE" preview --host 0.0.0.0 --port 5173
