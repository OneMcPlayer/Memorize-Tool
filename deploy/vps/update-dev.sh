#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/vps/common.sh
. "$SCRIPT_DIR/common.sh"

BRANCH="${DEPLOY_BRANCH:-dev}"
REMOTE="${DEPLOY_REMOTE:-origin}"
RUN_TESTS="${RUN_TESTS:-0}"
FORCE="${FORCE:-0}"
STATE_DIR="${STATE_DIR:-$APP_DIR/.deploy}"
LAST_SUCCESS_FILE="$STATE_DIR/last-success-$BRANCH"
LOCK_FILE="$STATE_DIR/update-$BRANCH.lock"
SERVICE_PREFIX="${SERVICE_PREFIX:-memorize}"
API_SERVICE_NAME="${API_SERVICE_NAME:-${SERVICE_PREFIX}-api.service}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-${SERVICE_PREFIX}-web.service}"

mkdir -p "$STATE_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deployment is already running."
  exit 0
fi

load_node_path
require_command git
require_command pnpm
load_env_file
cd_app

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempt

  for attempt in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done

  echo "$name did not become healthy: $url" >&2
  return 1
}

echo "Deploying $REMOTE/$BRANCH in $APP_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Refusing to deploy with uncommitted local changes." >&2
  git status --short >&2
  exit 1
fi

git fetch "$REMOTE" "$BRANCH"

remote_sha="$(git rev-parse "$REMOTE/$BRANCH")"
current_sha="$(git rev-parse HEAD)"
last_success=""
if [ -f "$LAST_SUCCESS_FILE" ]; then
  last_success="$(cat "$LAST_SUCCESS_FILE")"
fi

if [ "$current_sha" != "$remote_sha" ]; then
  current_branch="$(git branch --show-current)"
  if [ "$current_branch" != "$BRANCH" ]; then
    git checkout "$BRANCH"
  fi
  git pull --ff-only "$REMOTE" "$BRANCH"
  current_sha="$(git rev-parse HEAD)"
fi

if [ "$FORCE" != "1" ] && [ "$last_success" = "$current_sha" ]; then
  echo "Already deployed $current_sha."
  exit 0
fi

pnpm install --frozen-lockfile --prod=false

if [ "$RUN_TESTS" = "1" ]; then
  pnpm run test
fi

pnpm run typecheck
pnpm --filter @workspace/api-server run build
BASE_PATH="${BASE_PATH:-/}" pnpm --filter @workspace/memorize-tool run build
pnpm run db:push

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload || true
  systemctl --user restart "$API_SERVICE_NAME"
  systemctl --user restart "$WEB_SERVICE_NAME"
fi

api_port="${API_PORT:-8080}"
web_port="${WEB_PORT:-25868}"
base_path="${BASE_PATH:-/}"
case "$base_path" in
  /*) ;;
  *) base_path="/$base_path" ;;
esac
case "$base_path" in
  */) ;;
  *) base_path="$base_path/" ;;
esac
if command -v curl >/dev/null 2>&1; then
  wait_for_url "API" "http://127.0.0.1:${api_port}/api/healthz"
  wait_for_url "web" "http://127.0.0.1:${web_port}${base_path}"
fi

printf "%s" "$current_sha" > "$LAST_SUCCESS_FILE"
echo "Deployed $current_sha."
