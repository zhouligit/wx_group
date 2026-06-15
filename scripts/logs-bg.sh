#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v pm2 >/dev/null 2>&1 || [ -x "$ROOT/node_modules/.bin/pm2" ]; then
  PM2="pm2"
  [ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"
  "$PM2" logs wx-api wx-web
  exit 0
fi

echo "=== tail logs/api.log ==="
tail -n 50 logs/api.log 2>/dev/null || echo "(无日志)"
echo ""
echo "=== tail logs/web.log ==="
tail -n 50 logs/web.log 2>/dev/null || echo "(无日志)"
