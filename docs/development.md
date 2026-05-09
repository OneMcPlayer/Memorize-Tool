# Development

This repo is intended to run outside Replit. Replit artifact files remain as
optional platform configuration, but the default development path is standard
Node, pnpm, PostgreSQL, and Vite.

## Required Tools

- Node 24
- pnpm
- PostgreSQL 16, or Docker for a local Postgres container

## Environment

Copy the template and fill in real values:

```bash
cp .env.example .env.local
```

Load it before running API or DB commands:

```bash
set -a; source .env.local; set +a
```

Required API variables:

- `MAIN_ACCESS_TOKEN`
- `SESSION_SECRET`
- `OPENROUTER_API_KEY`
- `DATABASE_URL`

Portable cache variables:

- `TTS_CACHE_PROVIDER=filesystem` stores generated TTS audio under
  `TTS_CACHE_DIR`.
- `TTS_CACHE_PROVIDER=none` disables backend TTS cache.
- `TTS_CACHE_PROVIDER=replit-object-storage` uses Replit Object Storage when
  running in a Replit environment.

## Local Postgres With Docker

```bash
docker run --name memorize-postgres-dev \
  -e POSTGRES_USER=memorize \
  -e POSTGRES_PASSWORD=memorize \
  -e POSTGRES_DB=memorize_dev \
  -p 54329:5432 \
  -d postgres:16
```

Later starts/stops:

```bash
docker start memorize-postgres-dev
docker stop memorize-postgres-dev
```

Apply the schema:

```bash
set -a; source .env.local; set +a
pnpm run db:push
```

## Run The App

Terminal 1, API:

```bash
set -a; source .env.local; set +a
PORT=8080 pnpm run dev:api
```

Terminal 2, frontend:

```bash
set -a; source .env.local; set +a
PORT=25868 BASE_PATH=/ API_PROXY_TARGET=http://127.0.0.1:8080 pnpm run dev:web
```

Open:

```text
http://localhost:25868/
```

In Codespaces, make port `25868` public and use the generated
`*.app.github.dev` URL. The frontend proxies `/api` to the private API port via
`API_PROXY_TARGET`. If the Vite server needs to be reachable from outside the
container, set `HOST=0.0.0.0` for the frontend command:

```bash
set -a; source .env.local; set +a
HOST=0.0.0.0 PORT=25868 BASE_PATH=/ API_PROXY_TARGET=http://127.0.0.1:8080 pnpm run dev:web
```

Diagnostics are open by default outside production. In production they are
disabled unless `ENABLE_DIAG_ROUTES=true`; when enabled, uploads require the
normal `MAIN_ACCESS_TOKEN` and log reads require `DIAG_ADMIN_TOKEN` by default.

## Replit Compatibility

The Replit-specific files are optional:

- `.replit`
- `.replitignore`
- `artifacts/*/.replit-artifact/artifact.toml`

Replit Vite plugins are disabled by default. Enable them only in a Replit
environment:

```bash
ENABLE_REPLIT_VITE_PLUGINS=true
```

Replit Object Storage is also opt-in through:

```bash
TTS_CACHE_PROVIDER=replit-object-storage
```
