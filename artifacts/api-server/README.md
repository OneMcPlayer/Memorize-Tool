# API Server

Backend for the Memorize Tool. Handles passkey login, user sessions, TTS,
audio transcription, and script storage.

## Required environment variables

The server fails to start if any of these are missing:

- `MAIN_ACCESS_TOKEN` — shared invite-code that gates the entire `/api/*`
  surface (except `GET /api/healthz`). Every request must carry the token in
  an `X-Access-Token` header. Rotate it by changing the secret and
  restarting; clients with a stored stale token will be auto-prompted to
  re-enter it.
- `SESSION_SECRET` — used to sign session JWTs issued after passkey login.
- `OPENROUTER_API_KEY` — used by the TTS / OpenRouter-backed routes.
- `DATABASE_URL` — PostgreSQL connection string for users, passkeys,
  sessions, and stored scripts.

## Sharing the access code with invited users

`MAIN_ACCESS_TOKEN` is a single shared secret. To onboard someone, send them
the published app URL plus the current value of the secret. They paste it
into the access-code prompt on first load; the token is then stored in their
browser's `localStorage` and attached to every subsequent request
automatically.

To revoke access for everyone, change `MAIN_ACCESS_TOKEN` in `.env.local`, your
deployment secret store, or the Replit secrets panel, then restart the API. All
existing browsers will be prompted to enter the new code on their next request.

## Optional portable cache settings

- `TTS_CACHE_PROVIDER=filesystem` — default outside Replit; stores generated
  TTS audio on disk.
- `TTS_CACHE_PROVIDER=none` — disables backend TTS caching.
- `TTS_CACHE_PROVIDER=replit-object-storage` — uses Replit Object Storage.
- `TTS_CACHE_DIR` — filesystem cache directory when using the filesystem
  provider.

See `../../docs/development.md` for local and Codespaces setup.

## Audio transcription guardrails

`POST /audio/transcriptions` rejects tiny uploaded files before forwarding to
OpenRouter. This catches failed mobile recordings, such as 5-byte MediaRecorder
containers from Safari, and returns a clear 400 response instead of an opaque
provider error.
