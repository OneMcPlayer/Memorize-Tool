#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

APP_DIR="${APP_DIR:-$DEFAULT_APP_DIR}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.staging}"

# shellcheck source=deploy/vps/common.sh
. "$SCRIPT_DIR/common.sh"

RUN_INSTALL="${RUN_INSTALL:-1}"
RUN_TESTS="${RUN_TESTS:-0}"
RUN_TYPECHECK="${RUN_TYPECHECK:-1}"
RUN_DB_PUSH="${RUN_DB_PUSH:-1}"
STATE_DIR="${STATE_DIR:-$APP_DIR/.deploy}"
LOCK_FILE="$STATE_DIR/restart-dev-local.lock"

mkdir -p "$STATE_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another local dev deployment is already running."
  exit 0
fi

load_node_path
require_command pnpm
load_env_file

SERVICE_PREFIX="${SERVICE_PREFIX:-memorize-dev}"
API_SERVICE_NAME="${API_SERVICE_NAME:-${SERVICE_PREFIX}-api.service}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-${SERVICE_PREFIX}-web.service}"

export NODE_ENV="${NODE_ENV:-production}"
export HOST="${HOST:-127.0.0.1}"
export API_PORT="${API_PORT:-18080}"
export WEB_PORT="${WEB_PORT:-15868}"
export BASE_PATH="${BASE_PATH:-/dev/}"
export API_PROXY_TARGET="${API_PROXY_TARGET:-http://127.0.0.1:${API_PORT}}"

cd_app

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempt

  for attempt in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "$name did not become healthy: $url" >&2
  return 1
}

normalize_base_path() {
  local value="$1"
  case "$value" in
    /*) ;;
    *) value="/$value" ;;
  esac
  case "$value" in
    */) ;;
    *) value="$value/" ;;
  esac
  printf "%s" "$value"
}

echo "Deploying local workspace to dev from $APP_DIR"
echo "Using env file: $ENV_FILE"
echo "Git fetch/pull and clean-tree checks are intentionally skipped."

if [ "$RUN_INSTALL" = "1" ]; then
  pnpm install --frozen-lockfile --prod=false
fi

if [ "$RUN_TESTS" = "1" ]; then
  pnpm run test
fi

if [ "$RUN_TYPECHECK" = "1" ]; then
  pnpm run typecheck
fi

pnpm --filter @workspace/api-server run build
BASE_PATH="$BASE_PATH" pnpm --filter @workspace/memorize-tool run build

if [ "$RUN_DB_PUSH" = "1" ]; then
  pnpm run db:push
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload || true
  systemctl --user restart "$API_SERVICE_NAME"
  systemctl --user restart "$WEB_SERVICE_NAME"
fi

api_port="${API_PORT:-18080}"
web_port="${WEB_PORT:-15868}"
base_path="$(normalize_base_path "${BASE_PATH:-/dev/}")"

if command -v curl >/dev/null 2>&1; then
  wait_for_url "dev API" "http://127.0.0.1:${api_port}/api/healthz"
  wait_for_url "dev web" "http://127.0.0.1:${web_port}${base_path}"
fi

echo "Local dev deployment completed."
