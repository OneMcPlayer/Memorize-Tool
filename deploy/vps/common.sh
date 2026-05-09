#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

APP_DIR="${APP_DIR:-$DEFAULT_APP_DIR}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"

load_node_path() {
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  export PATH="$PNPM_HOME:$HOME/.npm-global/bin:$PATH"

  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    exit 1
  fi
}

load_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Missing environment file: $ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}

cd_app() {
  cd "$APP_DIR"
}
