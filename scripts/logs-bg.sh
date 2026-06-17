#!/usr/bin/env bash
# 查看后台服务状态与 API 错误（避免只看旧日志误判）
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PM2="pm2"
[ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"

if ! command -v pm2 >/dev/null 2>&1 && [ ! -x "$ROOT/node_modules/.bin/pm2" ]; then
  echo "未安装 PM2，查看 nohup 日志："
  tail -n 50 logs/api.log 2>/dev/null || true
  tail -n 50 logs/web.log 2>/dev/null || true
  exit 0
fi

LINES="${1:-50}"

echo "========== PM2 状态 =========="
"$PM2" status wx-api wx-web 2>/dev/null || "$PM2" status
echo ""

echo "========== 当前 API 进程 =========="
"$PM2" describe wx-api 2>/dev/null | grep -E "status|pid|uptime|restarts|created at" || true
echo ""

echo "========== 是否已部署 body limit 10mb =========="
if grep -aq "body limit 10mb" logs/api-out*.log 2>/dev/null; then
  grep -a "body limit 10mb" logs/api-out*.log | tail -1
else
  echo "✗ 未找到 '(body limit 10mb)' → 服务器可能仍在跑旧代码，请执行: npm run redeploy"
fi
echo ""

echo "========== 健康检查 =========="
curl -sf http://127.0.0.1:3000/api/v1/health && echo "" || echo "✗ API 无响应"
echo ""

echo "========== 最近 API 错误（最后 ${LINES} 行）=========="
echo "（若时间戳是几天前的，说明当前没有新报错，下面可能是历史记录）"
tail -n "$LINES" logs/api-error*.log 2>/dev/null || echo "(无 api-error 日志)"
echo ""

echo "========== 最近 API 输出（最后 10 行）=========="
tail -n 10 logs/api-out*.log 2>/dev/null || true
echo ""

echo "实时跟踪: pm2 logs wx-api --lines 100"
echo "清空旧日志后重启: pm2 flush && npm run redeploy"
