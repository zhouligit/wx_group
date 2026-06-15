#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v pm2 >/dev/null 2>&1 || [ -x "$ROOT/node_modules/.bin/pm2" ]; then
  PM2="pm2"
  [ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"
  "$PM2" delete wx-api wx-web 2>/dev/null || true
  echo "PM2 进程已停止"
fi

for name in api web; do
  pidfile="logs/${name}.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "已停止 ${name} (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
done

echo "全部后台服务已停止"
