#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v pm2 >/dev/null 2>&1 || [ -x "$ROOT/node_modules/.bin/pm2" ]; then
  PM2="pm2"
  [ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"
  "$PM2" status
  exit 0
fi

echo "=== API ==="
if [ -f logs/api.pid ] && kill -0 "$(cat logs/api.pid)" 2>/dev/null; then
  echo "运行中 pid $(cat logs/api.pid)"
else
  echo "未运行"
fi

echo "=== Web ==="
if [ -f logs/web.pid ] && kill -0 "$(cat logs/web.pid)" 2>/dev/null; then
  echo "运行中 pid $(cat logs/web.pid)"
else
  echo "未运行"
fi
