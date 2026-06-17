#!/usr/bin/env bash
# 检查服务器 API 是否已部署 body limit 10mb、端口是否被旧进程占用
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "========== 1. 编译产物是否含 10mb =========="
MAIN="$ROOT/server/dist/main.js"
if [ ! -f "$MAIN" ]; then
  echo "✗ $MAIN 不存在，请 npm run build:server"
  exit 1
fi
if grep -q "10mb" "$MAIN"; then
  echo "✓ server/dist/main.js 含 10mb 配置"
else
  echo "✗ server/dist/main.js 无 10mb → 代码未更新或未 build"
  echo "  执行: npm run pull:deploy && npm run build:server && npm run redeploy"
  exit 1
fi

echo ""
echo "========== 2. 3000 端口占用 =========="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep ':3000 ' || echo "(无进程监听 3000)"
elif command -v lsof >/dev/null 2>&1; then
  lsof -i :3000 2>/dev/null || echo "(无进程监听 3000)"
else
  echo "(跳过，无 ss/lsof)"
fi

echo ""
echo "========== 3. PM2 wx-api =========="
PM2="pm2"
[ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"
if command -v pm2 >/dev/null 2>&1 || [ -x "$ROOT/node_modules/.bin/pm2" ]; then
  "$PM2" describe wx-api 2>/dev/null | grep -E "status|pid|uptime|restarts" || echo "wx-api 未在 PM2 中"
else
  echo "未安装 PM2"
fi

echo ""
echo "========== 4. 启动日志是否含 body limit 10mb =========="
if grep -aq "body limit 10mb" logs/api-out*.log 2>/dev/null; then
  grep -a "body limit 10mb" logs/api-out*.log | tail -1
else
  echo "✗ 运行中的 API 未打印 body limit 10mb → 很可能仍在跑旧代码"
fi

echo ""
echo "========== 5. 健康检查 =========="
curl -sf http://127.0.0.1:3000/api/v1/health && echo "" || echo "✗ /api/v1/health 失败"

echo ""
echo "========== 6. 模拟 prepay 请求（小 body，不应 PayloadTooLarge）=========="
HTTP_CODE=$(curl -s -o /tmp/wx-prepay-test.json -w "%{http_code}" \
  -X POST http://127.0.0.1:3000/api/v1/payments/wechat/prepay \
  -H "Content-Type: application/json" \
  -d '{"orderNo":"test","scene":"h5","returnUrl":"https://example.com/"}' || echo "000")
echo "HTTP $HTTP_CODE"
head -c 200 /tmp/wx-prepay-test.json 2>/dev/null; echo ""
if [ "$HTTP_CODE" = "413" ] || grep -q "PayloadTooLarge\|entity too large" /tmp/wx-prepay-test.json 2>/dev/null; then
  echo "✗ 仍触发 PayloadTooLarge → 必须强制重启（见下方）"
fi

echo ""
echo "========== 7. 错误日志最新时间（804991 为 6/16 旧进程，可忽略）=========="
tail -3 logs/api-error*.log 2>/dev/null || true

echo ""
echo "--- 若第 1/4/6 步有 ✗，在服务器执行 ---"
echo "  cd /opt/wx_group && npm run redeploy && bash scripts/verify-deploy.sh"
