#!/usr/bin/env bash
# 校验微信支付 v3 签名配置（SIGN_ERROR 时用）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
[ -f "$ENV_FILE" ] || ENV_FILE="$ROOT/server/.env"

load_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true
}

echo "========== .env 文件 =========="
echo "$ENV_FILE"
echo ""

MCH_ID="$(load_env WECHAT_MCH_ID)"
APP_ID="$(load_env WECHAT_APP_ID)"
SERIAL_NO="$(load_env WECHAT_SERIAL_NO)"
KEY_PATH="$(load_env WECHAT_PRIVATE_KEY_PATH)"
INLINE_KEY="$(load_env WECHAT_PRIVATE_KEY)"
API_V3="$(load_env WECHAT_API_V3_KEY)"

if [ -n "$INLINE_KEY" ] && [ -n "$KEY_PATH" ]; then
  echo "⚠ 同时配置了 WECHAT_PRIVATE_KEY 和 WECHAT_PRIVATE_KEY_PATH"
  echo "  程序优先使用 PATH 文件；建议删除 .env 中的 WECHAT_PRIVATE_KEY 避免混淆"
  echo ""
fi

echo "WECHAT_MCH_ID=${MCH_ID:-(未设置)}"
echo "WECHAT_APP_ID=${APP_ID:-(未设置)}"
echo "WECHAT_SERIAL_NO=${SERIAL_NO:-(未设置)}"
echo "WECHAT_PRIVATE_KEY_PATH=${KEY_PATH:-(未设置)}"
echo "WECHAT_API_V3_KEY=${API_V3:+已设置(${#API_V3}字符)}"
echo ""

if [ -z "$KEY_PATH" ] || [ ! -f "$KEY_PATH" ]; then
  echo "✗ 私钥文件不存在: ${KEY_PATH:-未配置 WECHAT_PRIVATE_KEY_PATH}"
  echo "  请从商户平台下载 API 证书，使用 apiclient_key.pem"
  exit 1
fi
echo "✓ 私钥文件存在: $KEY_PATH"

if ! openssl pkey -in "$KEY_PATH" -check -noout 2>/dev/null; then
  echo "✗ 私钥格式无效，请确认是 apiclient_key.pem（不是 apiclient_cert.pem）"
  exit 1
fi
echo "✓ 私钥格式有效"
KEY_MD5="$(openssl md5 -r "$KEY_PATH" 2>/dev/null | awk '{print $1}')"
echo "  私钥文件 md5: $KEY_MD5（可与小程序服务器 apiclient_key.pem 对比，必须一致）"
echo ""
echo "说明: 运行时只需 apiclient_key.pem + WECHAT_SERIAL_NO（与 wander_meet 相同）"
echo "      apiclient_cert.pem 仅用于核对序列号，程序不读取该文件"

CERT_PATH="$(dirname "$KEY_PATH")/apiclient_cert.pem"
if [ -f "$CERT_PATH" ]; then
  CERT_SERIAL="$(openssl x509 -in "$CERT_PATH" -noout -serial 2>/dev/null | sed 's/serial=//' | tr 'a-f' 'A-F')"
  echo ""
  echo "========== 证书序列号对比 =========="
  echo "apiclient_cert.pem 序列号: $CERT_SERIAL"
  echo ".env WECHAT_SERIAL_NO:     ${SERIAL_NO:-空}"
  SERIAL_UPPER="$(echo "$SERIAL_NO" | tr 'a-f' 'A-F')"
  if [ "$CERT_SERIAL" = "$SERIAL_UPPER" ]; then
    echo "✓ 序列号与证书一致"
  else
    echo "✗ 序列号不一致 → SIGN_ERROR 最常见原因！"
    echo "  请把 .env 中 WECHAT_SERIAL_NO 改为: $CERT_SERIAL"
  fi
else
  echo ""
  echo "未找到 $CERT_PATH，无法自动对比序列号"
  echo "请在商户平台 → 账户中心 → API安全 → 商户API证书 查看序列号"
fi

echo ""
echo "========== 检查清单 =========="
echo "1. WECHAT_SERIAL_NO = 商户API证书序列号（不是平台证书）"
echo "2. WECHAT_PRIVATE_KEY_PATH = apiclient_key.pem 路径"
echo "3. 私钥与序列号必须来自同一套 API 证书"
echo "4. WECHAT_MCH_ID = 商户号（10位数字）"
echo "5. WECHAT_APP_ID = 已绑定商户号的服务号 AppID"
echo "6. 改 .env 后执行: npm run stop:bg && npm run start:bg"
