#!/usr/bin/env bash
# 后台启动 API + C 端 Web（需先 npm run build）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p logs

if [ ! -f "$ROOT/.env" ] && [ ! -f "$ROOT/server/.env" ]; then
  echo "请先创建 .env: cp .env.example .env" >&2
  exit 1
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo ">>> 构建前后端..."
  npm run build:server
  npm run build:web
fi

if [ ! -f "$ROOT/server/dist/main.js" ]; then
  if [ -f "$ROOT/server/dist/src/main.js" ]; then
    echo "检测到旧构建路径 server/dist/src/main.js，请重新执行: npm run build:server" >&2
  else
    echo "server/dist/main.js 不存在，请先 npm run build:server" >&2
  fi
  exit 1
fi

if [ ! -d "$ROOT/apps/web/dist" ]; then
  echo "apps/web/dist 不存在，请先 npm run build:web" >&2
  exit 1
fi

if command -v pm2 >/dev/null 2>&1 || [ -x "$ROOT/node_modules/.bin/pm2" ]; then
  PM2="pm2"
  [ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"
  echo ">>> 使用 PM2 后台启动..."
  "$PM2" delete wx-api wx-web 2>/dev/null || true
  "$PM2" start ecosystem.config.cjs
  "$PM2" save 2>/dev/null || true
  echo ""
  echo "已启动（PM2）："
  "$PM2" status
  echo ""
  wait_for_port() {
    local url="$1"
    local name="$2"
    local i
    for i in $(seq 1 30); do
      if curl -sf "$url" >/dev/null 2>&1 || curl -sfI "$url" >/dev/null 2>&1; then
        echo "✓ $name 就绪"
        return 0
      fi
      sleep 1
    done
    echo "✗ $name 未就绪，最近日志：" >&2
    "$PM2" logs wx-api wx-web --lines 20 --nostream 2>/dev/null || true
    return 1
  }
  wait_for_port "http://127.0.0.1:3000/api/v1/health" "API" || exit 1
  wait_for_port "http://127.0.0.1:5173" "Web" || exit 1
  echo ""
  echo "  API:  http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000/api/v1/health"
  echo "  Web:  http://$(hostname -I 2>/dev/null | awk '{print $1}'):5173"
  echo ""
  echo "查看日志: npm run logs:bg"
  echo "停止服务: npm run stop:bg"
  exit 0
fi

echo ">>> 未安装 PM2，使用 nohup 后台启动..."

set -a
[ -f "$ROOT/server/.env" ] && . "$ROOT/server/.env"
[ -f "$ROOT/.env" ] && . "$ROOT/.env"
set +a

if [ -f logs/api.pid ] && kill -0 "$(cat logs/api.pid)" 2>/dev/null; then
  echo "API 已在运行 (pid $(cat logs/api.pid))"
else
  cd "$ROOT/server"
  nohup node dist/main.js >> "$ROOT/logs/api.log" 2>&1 &
  echo $! > "$ROOT/logs/api.pid"
  echo "API 已启动 pid $(cat "$ROOT/logs/api.pid")"
fi

if [ -f logs/web.pid ] && kill -0 "$(cat logs/web.pid)" 2>/dev/null; then
  echo "Web 已在运行 (pid $(cat logs/web.pid))"
else
  nohup bash "$ROOT/scripts/preview-web.sh" >> "$ROOT/logs/web.log" 2>&1 &
  echo $! > "$ROOT/logs/web.pid"
  echo "Web 已启动 pid $(cat "$ROOT/logs/web.pid")"
fi

wait_for_port() {
  local url="$1"
  local name="$2"
  local i
  for i in $(seq 1 30); do
    if curl -sf "$url" >/dev/null 2>&1 || curl -sfI "$url" >/dev/null 2>&1; then
      echo "✓ $name 就绪"
      return 0
    fi
    sleep 1
  done
  echo "✗ $name 启动超时，请查看日志: npm run logs:bg" >&2
  return 1
}

echo ""
wait_for_port "http://127.0.0.1:3000/api/v1/health" "API"
wait_for_port "http://127.0.0.1:5173" "Web"
echo "  API 日志: tail -f logs/api.log"
echo "  Web 日志: tail -f logs/web.log"
echo "  停止:     npm run stop:bg"
