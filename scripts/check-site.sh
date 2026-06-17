#!/usr/bin/env bash
# 排查 jiaoyou.yikuaikaixin.cn 无法访问 / 502
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "========== 1. PM2 进程 =========="
PM2="pm2"
[ -x "$ROOT/node_modules/.bin/pm2" ] && PM2="$ROOT/node_modules/.bin/pm2"
"$PM2" status 2>/dev/null || echo "PM2 未运行"

echo ""
echo "========== 2. 端口监听 =========="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep -E ':80|:443|:3000|:5173' || echo "(无相关端口)"
fi

echo ""
echo "========== 3. 本地 API =========="
curl -sf http://127.0.0.1:3000/api/v1/health && echo "" || echo "✗ API 127.0.0.1:3000 无响应"

echo ""
echo "========== 4. 静态文件 dist =========="
if [ -f "$ROOT/apps/web/dist/index.html" ]; then
  echo "✓ apps/web/dist/index.html 存在"
else
  echo "✗ 缺少 dist，执行: npm run build:web"
fi

echo ""
echo "========== 5. 经 Nginx 本机访问 =========="
curl -sfI -H "Host: jiaoyou.yikuaikaixin.cn" http://127.0.0.1/ | head -3 || echo "✗ Nginx 80 无响应"
curl -sfI -H "Host: jiaoyou.yikuaikaixin.cn" http://127.0.0.1/group/151 | head -3 || echo "✗ /group/151 无响应"

echo ""
echo "========== 6. 外网 HTTPS（若已配置）=========="
curl -sfI --max-time 5 https://jiaoyou.yikuaikaixin.cn/ 2>/dev/null | head -3 || echo "✗ 外网 HTTPS 失败（502/超时/证书）"

echo ""
echo "--- 常见修复 ---"
echo "  npm run redeploy"
echo "  npm run build:web"
echo "  sudo cp deploy/nginx.jiaoyou.conf /etc/nginx/sites-available/jiaoyou && sudo nginx -t && sudo systemctl reload nginx"
