#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/vps/common.sh
. "$SCRIPT_DIR/common.sh"

SERVICE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UPDATE_INTERVAL="${UPDATE_INTERVAL:-5min}"
SERVICE_PREFIX="${SERVICE_PREFIX:-memorize}"
API_SERVICE_NAME="${API_SERVICE_NAME:-${SERVICE_PREFIX}-api.service}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-${SERVICE_PREFIX}-web.service}"
UPDATE_SERVICE_NAME="${UPDATE_SERVICE_NAME:-${SERVICE_PREFIX}-update.service}"
UPDATE_TIMER_NAME="${UPDATE_TIMER_NAME:-${SERVICE_PREFIX}-update.timer}"

mkdir -p "$SERVICE_DIR"

cat > "$SERVICE_DIR/$API_SERVICE_NAME" <<UNIT
[Unit]
Description=Memorize Tool API ($SERVICE_PREFIX)
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=APP_DIR=$APP_DIR
Environment=ENV_FILE=$ENV_FILE
ExecStart=$APP_DIR/deploy/vps/run-api.sh
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
UNIT

cat > "$SERVICE_DIR/$WEB_SERVICE_NAME" <<UNIT
[Unit]
Description=Memorize Tool web preview ($SERVICE_PREFIX)
After=network-online.target $API_SERVICE_NAME

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=APP_DIR=$APP_DIR
Environment=ENV_FILE=$ENV_FILE
ExecStart=$APP_DIR/deploy/vps/run-web.sh
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
UNIT

cat > "$SERVICE_DIR/$UPDATE_SERVICE_NAME" <<UNIT
[Unit]
Description=Update Memorize Tool from dev branch ($SERVICE_PREFIX)
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
Environment=APP_DIR=$APP_DIR
Environment=ENV_FILE=$ENV_FILE
Environment=SERVICE_PREFIX=$SERVICE_PREFIX
Environment=API_SERVICE_NAME=$API_SERVICE_NAME
Environment=WEB_SERVICE_NAME=$WEB_SERVICE_NAME
ExecStart=$APP_DIR/deploy/vps/update-dev.sh
UNIT

cat > "$SERVICE_DIR/$UPDATE_TIMER_NAME" <<UNIT
[Unit]
Description=Poll dev branch and update Memorize Tool ($SERVICE_PREFIX)

[Timer]
OnBootSec=2min
OnUnitActiveSec=$UPDATE_INTERVAL
AccuracySec=30s
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl --user daemon-reload
systemctl --user enable "$API_SERVICE_NAME" "$WEB_SERVICE_NAME" "$UPDATE_TIMER_NAME"

cat <<MSG
Installed user services in $SERVICE_DIR

Start now:
  systemctl --user start $API_SERVICE_NAME $WEB_SERVICE_NAME $UPDATE_TIMER_NAME

Check status:
  systemctl --user status $API_SERVICE_NAME $WEB_SERVICE_NAME $UPDATE_TIMER_NAME

For services to survive logout, an admin must run once:
  sudo loginctl enable-linger $USER
MSG
