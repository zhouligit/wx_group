#!/usr/bin/env bash
# 兼容 Docker Compose V2 / docker-compose V1 / podman-compose
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVICES="${*:-mysql redis}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

run_compose() {
  local cmd=("$1")
  shift
  echo ">>> ${cmd[*]} $*"
  "${cmd[@]}" "$@"
}

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  run_compose docker compose -f "$COMPOSE_FILE" up -d $SERVICES
elif command -v docker-compose >/dev/null 2>&1; then
  run_compose docker-compose -f "$COMPOSE_FILE" up -d $SERVICES
elif command -v podman-compose >/dev/null 2>&1; then
  run_compose podman-compose -f "$COMPOSE_FILE" up -d $SERVICES
else
  echo "未找到可用的 compose 工具，请安装以下任一："
  echo "  - Docker Desktop（含 docker compose）"
  echo "  - docker-compose：brew install docker-compose"
  echo "  - podman-compose：brew install podman-compose"
  exit 1
fi

echo "MySQL / Redis 已启动"
