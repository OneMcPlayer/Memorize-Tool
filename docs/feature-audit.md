# Feature Audit

Date: 2026-05-03

This audit compares the three historical code lines plus the imported
`Code-Memorize.zip` target now applied to `dev`.

## Sources

- `main` / `origin/main`: stable first React version. CRA frontend, static
  script library, local-only memorization flows, Cypress and audio tests.
- old `dev` / `origin/dev`: same CRA base with the current-year script update,
  plus first backend work under `server/` and `auth/` for Express, SQLite,
  passkeys, TTS/STT proxying, and Cypress coverage.
- TMP reference: separate experiment repo preserved under
  `.local/reference/TMP` inside the imported archive. It focused on autoplay,
  recording, CarPlay/media-session behavior, Expo native audio, and
  backend-assisted Realtime/WebRTC/tap rehearsal experiments.
- `Code-Memorize.zip` target: current imported monorepo target. It replaces the
  CRA shape with a pnpm workspace, Vite PWA frontend, Express API artifact,
  shared libraries, typed tests, and Replit artifact structure.

## High-Level Differences

| Area            | `main`                      | old `dev`                                           | TMP                                                  | current `dev` target                                                       |
| --------------- | --------------------------- | --------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| App structure   | Single CRA app in `src/`    | CRA app plus `server/` and `auth/`                  | Vite lab app plus experiment folders                 | pnpm workspace with `artifacts/`, `lib/`, `scripts/`                       |
| Script data     | Static local JSON scripts   | Current-year script library update                  | Lab script fixtures                                  | Shared `@workspace/scripts-data` package used by app/API                   |
| Backend         | None                        | Express, SQLite/passkey experiments, TTS/STT routes | Local realtime lab server                            | Express API artifact with access token, passkeys, users, scripts, TTS, STT |
| Auth/access     | Frontend-only               | Passkey experiment plus auth assets                 | Not the main focus                                   | Shared access token gate plus passkey/user APIs                            |
| Live voice mode | Basic browser TTS/STT flow  | Backend-assisted TTS/STT in CRA                     | Heavy autoplay/record/realtime experiments           | Vite live practice with TTS, STT, cue tags, voice assignment, zen mode     |
| Diagnostics     | Console/browser test output | Cypress/debug pages                                 | Rich server-side session logs and client diagnostics | Restored generic `/api/diag/*` session/log/diagnostic endpoints            |
| Test stack      | CRA/Jest, Cypress           | CRA/Jest, Cypress                                   | Playwright and lab tests                             | Vitest per workspace plus Playwright E2E                                   |

## What TMP Taught

The TMP notes indicate that the remaining voice-mode risk is not just product
logic. The main technical lessons were:

- Standalone iPhone PWA mode is fragile around playback-to-recording handoff.
- `navigator.audioSession.type = "playback"` can interfere with later mic
  capture.
- Empty or tiny first `MediaRecorder` blobs are a real device behavior, not only
  a code bug.
- Native Expo audio looked much more reliable for playback, cold recording, and
  automatic cue-plus-record flows.
- Backend-assisted browser WebRTC reached a much stronger Safari browser-tab
  result than the older request/response audio chain.
- Tap rehearsal improved turn boundaries, but later turns could still produce
  zero-byte recordings after correction playback.
- Exportable logs and browser-side breadcrumbs were essential for iterating
  without guessing.

## What The Current Target Keeps

The imported target is the right base to continue from because it already keeps
most product-level work:

- current shared script library
- Vite PWA frontend
- Express API artifact
- access-token gate for the API surface
- passkey/user/session routes
- server-backed TTS and STT routes
- live practice with partner playback, user recording, correction diff, cue
  tags, voice assignment, and zen mode
- shared typed packages for scripts, DB schema, generated API client, and API
  zod schemas
- Vitest and Playwright test coverage

## Restored Diagnostics

TMP's exact realtime endpoints were experiment-specific, so this pass restored
the reusable diagnostics capability into the current API shape instead of
copying the realtime lab server wholesale.

Backend:

- `POST /api/diag/sessions`
- `POST /api/diag/client-logs`
- `POST /api/diag/sessions/:sessionId/client-logs`
- `GET /api/diag/sessions/:sessionId/logs`
- `POST /api/diag/diagnostics`
- `POST /api/diag/sessions/:sessionId/diagnostics`
- existing `POST /api/diag/boot-failure`
- existing `GET /api/diag/web-health`

Storage and privacy:

- session logs are kept in memory for quick retrieval
- non-test runs also append JSONL to `artifacts/api-server/output/diag-session-logs.jsonl`
- diagnostics are best effort and must never break rehearsal/API requests
- API keys, auth headers, tokens, passwords, audio/blob fields, transcripts,
  spoken text, expected text, script text, line text, and recording fields are
  redacted before storage

Frontend:

- global window errors and unhandled promise rejections are captured
- live practice starts a diagnostic session on mount
- TTS, mic permission, recording, STT, result status, navigation, and copy-report
  actions emit sanitized breadcrumbs
- no script line text or transcript text is intentionally sent in breadcrumbs
- the classic live view includes a `Copy debug report` fallback button for cases
  where backend upload is unavailable

## Remaining Decisions

These are the areas that still need product/strategy decisions rather than a
simple merge:

- whether to keep investing in PWA voice reliability or plan a native audio path
- whether the TMP realtime/tap rehearsal architecture should become a formal
  feature in this repo
- whether CarPlay/media-session controls are still in scope for the course app
- whether diagnostics should get an authenticated admin viewer, or remain API
  endpoints plus JSONL export for now
- whether old Cypress scenarios from CRA should be ported to Playwright or
  retired in favor of the new Vitest/Playwright suite

## Current Recommendation

Use the imported `Code-Memorize.zip` target as the base on `dev`, keep `main`
unchanged, and continue with small verification-driven slices:

1. Stabilize and verify the current PWA/API flow.
2. Keep the restored diagnostics enabled during real-device rehearsal tests.
3. Only port TMP realtime/tap/native ideas after the current target is green and
   a real device run shows which voice-mode failure remains.
