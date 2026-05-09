# Hermes VPS Deployment Prompt

Copy this prompt into Hermes on the VPS. It assumes Hermes runs as the
non-root deployment user.

```text
You are Hermes running on a VPS as a non-root Linux user. Deploy the Memorize
Tool from the `dev` branch so it stays online without GitHub Codespaces and can
be shared with friends.

Repository:
  https://github.com/OneMcPlayer/Memorize-Tool.git

Target branch:
  dev

Deployment directory:
  $HOME/apps/memorize-tool

Important constraints:
  - Do not run commands as root.
  - Do not print secrets back to the chat.
  - Do not commit `.env.production`.
  - If a root/admin action is needed, stop and print the exact command for the
    server admin to run.
  - Prefer systemd user services for long-running processes.

Ask me for these values if they are not already available:
  - Public domain, for example memorize.example.com
  - PostgreSQL DATABASE_URL
  - OPENROUTER_API_KEY
  - MAIN_ACCESS_TOKEN, or offer to generate one
  - SESSION_SECRET, or offer to generate one

Root/admin prerequisites to verify or request:
  - git
  - Node.js 22+ or 24+
  - pnpm, usually via corepack
  - PostgreSQL database available through DATABASE_URL, or an external managed
    Postgres URL
  - Caddy or Nginx reverse proxy for HTTPS
  - user lingering enabled so user services survive logout:
      sudo loginctl enable-linger <deploy-user>

Recommended public reverse proxy shape:
  - Public HTTPS domain -> frontend service on 127.0.0.1:25868
  - Public HTTPS /api and /api/* -> API service on 127.0.0.1:8080

Example Caddyfile for the admin:
  memorize.example.com {
    encode zstd gzip

    @api path /api /api/*
    reverse_proxy @api 127.0.0.1:8080

    reverse_proxy 127.0.0.1:25868
  }

Deployment steps:

1. Clone or update the repo:
     mkdir -p "$HOME/apps"
     if [ ! -d "$HOME/apps/memorize-tool/.git" ]; then
       git clone --branch dev https://github.com/OneMcPlayer/Memorize-Tool.git "$HOME/apps/memorize-tool"
     fi
     cd "$HOME/apps/memorize-tool"
     git checkout dev
     git pull --ff-only origin dev

2. Ensure pnpm is available:
     corepack enable
     pnpm --version

   If `corepack enable` fails due to permissions, ask the admin to install pnpm
   or Node properly for this user.

3. Create `$HOME/apps/memorize-tool/.env.production` with mode 600. Use real
   values and do not print them:

     NODE_ENV=production
     LOG_LEVEL=info

     MAIN_ACCESS_TOKEN=<shared-access-token>
     SESSION_SECRET=<long-random-secret>
     OPENROUTER_API_KEY=<openrouter-key>
     DATABASE_URL=<postgresql-url>

     API_PORT=8080
     WEB_PORT=25868
     BASE_PATH=/

     TTS_CACHE_PROVIDER=filesystem
     TTS_CACHE_DIR=$HOME/apps/memorize-tool/artifacts/api-server/output/tts-cache
     DIAG_LOG_PATH=$HOME/apps/memorize-tool/artifacts/api-server/output/diag-session-logs.jsonl

     WEBAUTHN_RP_ID=<public-domain-without-https>
     WEBAUTHN_ORIGIN=https://<public-domain>
     WEB_HEALTH_URL=https://<public-domain>/

   This file is sourced by bash. Wrap any value that contains shell-sensitive
   characters like `&`, `#`, spaces, or parentheses in single quotes.

   Generate secrets if needed:
     node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

4. Install user systemd services from the repo scripts:
     APP_DIR="$PWD" ENV_FILE="$PWD/.env.production" ./deploy/vps/install-systemd-user.sh

5. Run the first deploy from dev:
     APP_DIR="$PWD" ENV_FILE="$PWD/.env.production" FORCE=1 ./deploy/vps/update-dev.sh

6. Start the auto-update timer:
     systemctl --user start memorize-update.timer

7. Verify local services:
     systemctl --user status memorize-api.service memorize-web.service memorize-update.timer
     curl -fsS http://127.0.0.1:8080/api/healthz
     curl -fsS http://127.0.0.1:25868/

8. Verify public HTTPS:
     curl -fsS https://<public-domain>/api/healthz
     Open https://<public-domain>/ on desktop and phone.

Auto-update behavior:
  - `memorize-update.timer` polls `origin/dev` every 5 minutes.
  - If a new commit is available, `deploy/vps/update-dev.sh` runs:
      git pull --ff-only origin dev
      pnpm install --frozen-lockfile --prod=false
      pnpm run typecheck
      pnpm --filter @workspace/api-server run build
      pnpm --filter @workspace/memorize-tool run build
      pnpm run db:push
      systemctl --user restart memorize-api.service memorize-web.service
  - It refuses to deploy if the VPS working tree has uncommitted local changes.

Manual update command:
  cd "$HOME/apps/memorize-tool"
  APP_DIR="$PWD" ENV_FILE="$PWD/.env.production" FORCE=1 ./deploy/vps/update-dev.sh

Useful logs:
  journalctl --user -u memorize-api.service -f
  journalctl --user -u memorize-web.service -f
  journalctl --user -u memorize-update.service -n 200 --no-pager

Final report back to me:
  - Current git commit
  - Whether services are active
  - Public URL
  - Health check result
  - Any admin/root action still required
```

## Notes

The update mechanism is timer-based polling, which works without root and
without exposing a webhook receiver. If push-triggered updates are needed later,
the safest next step is a GitHub Action that SSHes into the VPS and runs:

```sh
systemctl --user start memorize-update.service
```
