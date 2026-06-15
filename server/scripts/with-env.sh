#!/usr/bin/env bash
# 加载 server/.env 或项目根目录 ../.env，再执行 Prisma 等命令
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT_DIR="$(cd "$SERVER_DIR/.." && pwd)"

set -a
if [ -f "$SERVER_DIR/.env" ]; then
  # shellcheck disable=SC1091
  . "$SERVER_DIR/.env"
elif [ -f "$ROOT_DIR/.env" ]; then
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
else
  echo "[with-env] 未找到 .env，请执行: cp .env.example .env" >&2
  exit 1
fi
set +a

exec "$@"
