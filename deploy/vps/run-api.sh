#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/vps/common.sh
. "$SCRIPT_DIR/common.sh"

load_node_path
require_command pnpm
load_env_file
cd_app

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${API_PORT:-8080}"

exec pnpm --filter @workspace/api-server run start
