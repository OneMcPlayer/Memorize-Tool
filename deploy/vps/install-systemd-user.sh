#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/vps/common.sh
. "$SCRIPT_DIR/common.sh"

SERVICE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UPDATE_INTERVAL="${UPDATE_INTERVAL:-5min}"

mkdir -p "$SERVICE_DIR"

cat > "$SERVICE_DIR/memorize-api.service" <<UNIT
[Unit]
Description=Memorize Tool API
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

cat > "$SERVICE_DIR/memorize-web.service" <<UNIT
[Unit]
Description=Memorize Tool web preview
After=network-online.target memorize-api.service

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

cat > "$SERVICE_DIR/memorize-update.service" <<UNIT
[Unit]
Description=Update Memorize Tool from dev branch
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
Environment=APP_DIR=$APP_DIR
Environment=ENV_FILE=$ENV_FILE
ExecStart=$APP_DIR/deploy/vps/update-dev.sh
UNIT

cat > "$SERVICE_DIR/memorize-update.timer" <<UNIT
[Unit]
Description=Poll dev branch and update Memorize Tool

[Timer]
OnBootSec=2min
OnUnitActiveSec=$UPDATE_INTERVAL
AccuracySec=30s
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl --user daemon-reload
systemctl --user enable memorize-api.service memorize-web.service memorize-update.timer

cat <<MSG
Installed user services in $SERVICE_DIR

Start now:
  systemctl --user start memorize-api.service memorize-web.service memorize-update.timer

Check status:
  systemctl --user status memorize-api.service memorize-web.service memorize-update.timer

For services to survive logout, an admin must run once:
  sudo loginctl enable-linger $USER
MSG
