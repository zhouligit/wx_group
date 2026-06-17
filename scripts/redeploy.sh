#!/usr/bin/env bash
# 强制重启 API + Web（解决 PM2 仍跑旧进程、502、body 限制未生效）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/git-pull.sh"

PM2="pm2"
[ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"

echo ">>> 停止旧进程..."
"$PM2" delete wx-api wx-web 2>/dev/null || true
pkill -f "node.*server/dist/main" 2>/dev/null || true
pkill -f "vite preview" 2>/dev/null || true
sleep 1

echo ">>> 安装依赖（npm ci，不修改 lock 文件）..."
npm ci

echo ">>> 构建..."
npm run build:server
npm run build:web

echo ">>> 启动..."
"$PM2" start ecosystem.config.cjs
"$PM2" save 2>/dev/null || true

echo ""
"$PM2" status
echo ""
curl -sf http://127.0.0.1:3000/api/v1/health && echo " ✓ API OK" || echo " ✗ API 未就绪"
curl -sfI http://127.0.0.1:5173 | head -1 || echo " ✗ Web 未就绪"
echo ""
echo "若 api-out 含 '(body limit 10mb)' 说明新代码已生效"
grep -a "body limit 10mb" logs/api-out*.log 2>/dev/null | tail -1 || true
