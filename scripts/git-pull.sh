#!/usr/bin/env bash
# 生产机拉代码：丢弃 npm install 改动的 package*.json / lock，避免 pull 冲突
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo ">>> 丢弃 npm 可能改动的依赖文件（以远程仓库为准）..."
git checkout -- package-lock.json package.json 2>/dev/null || true
git checkout -- apps/web/package.json apps/admin/package.json server/package.json 2>/dev/null || true

echo ">>> git fetch origin..."
git fetch origin

echo ">>> git pull origin $BRANCH..."
if git pull --ff-only origin "$BRANCH"; then
  echo "✓ 已同步到 origin/$BRANCH"
  exit 0
fi

echo ">>> fast-forward 失败，强制 reset 到 origin/$BRANCH（.env 等未跟踪文件不受影响）..."
git reset --hard "origin/$BRANCH"
echo "✓ 已强制同步到 origin/$BRANCH"
