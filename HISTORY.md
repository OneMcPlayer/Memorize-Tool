# HISTORY

This file records major decisions, migrations, and version changes for the
Memorize Tool project. It is intentionally higher level than git history: it
should explain why changes happened and what was verified.

## Current Branch Policy

- `main` is kept as the older first public version.
- Active modernization happens on `dev`.
- `Code-Memorize.zip` is treated as the latest target snapshot for the current
  modernization work.
- TMP is treated as an experiment source, especially for Live mode diagnostics,
  autoplay, recording behavior, and failure notes.

## Unreleased After v3.0.0-beta.1

Date: 2026-05-04

Changes and decisions:

- Added root `TODO.md` and `HISTORY.md` so open work and project decisions are
  tracked in the repository instead of only in chat.
- Added a Vite development proxy controlled by `API_PROXY_TARGET`.
  - Reason: Codespaces exposes a public frontend port, but the API can stay on a
    private local port. The frontend can proxy `/api` to the local API during
    development.
  - Behavior: inactive unless `API_PROXY_TARGET` is set.
- Made Replit platform integrations optional instead of hard runtime imports.
  - Vite Replit plugins are now loaded only when
    `ENABLE_REPLIT_VITE_PLUGINS=true`.
  - Backend TTS cache now supports `filesystem`, `none`, and
    `replit-object-storage`.
  - Filesystem cache is the portable default outside Replit.
- Added `.env.example` and `docs/development.md` for local/Codespaces setup.
- Replaced user-facing “restart Replit workflows” messages with
  platform-neutral backend/frontend availability guidance.
- Created local-only `.env.local` for development secrets and database URL.
  - It is excluded via `.git/info/exclude`, not committed.
- Started local Docker Postgres container `memorize-postgres-dev` on port
  `54329` and applied the Drizzle schema.
- Ran the app in Codespaces with:
  - API on local port `8080`
  - frontend on public port `25868`
  - public URL shape:
    `https://<codespace-name>-25868.app.github.dev/`
- Hardened Live mode microphone capture after iPhone Safari produced repeated
  5-byte STT uploads.
  - Frontend now refreshes stale/ended microphone streams before recording.
  - Recorder diagnostics now include non-redacted capture byte count, duration,
    chunk count, MIME type, recorder state, stream state, and track state.
  - Tiny or too-short captures are treated as no-input locally and are not sent
    to STT.
  - Backend `/audio/transcriptions` rejects tiny uploads before calling
    OpenRouter, returning a clear 400 error.
- Changed Live mode STT language hint from the UI language to Italian (`it`).
  - Reason: the rehearsal scripts are Italian even when the app UI is set to
    English, and the previous `currentLang` behavior sent `en` in the iPhone
    test.
- Changed the default Live mode STT model from Gemini audio input to
  `google/chirp-3`.
  - Reason: manual testing showed Chirp 3 was much faster for the current voice
    rehearsal flow.
  - The Gemini TTS model remains unchanged; this only affects speech-to-text.
  - The internal STT performance page now compares Whisper large-v3 with
    Chirp 3 instead of Gemini.
- Release the microphone stream after each recording stop in Live mode.
  - Reason: iPhone Safari can keep the audio route in a microphone/capture mode
    after recording, which can make later TTS playback sound noticeably dimmed
    or lowered and may contribute to repeated empty MediaRecorder chunks.
- Reworked frontend TTS playback to use one persistent audio element.
  - Live mode now primes the element immediately from the `Play scene` tap.
  - Each generated cue line reuses that same element instead of creating a new
    `Audio()` instance per line.
  - Reason: iPhone Safari intermittently rejected later `play()` calls in long
    cue sequences with `NotAllowedError`.
- Hardened persistent TTS playback after the 2026-05-06 iPhone test.
  - Evidence: diagnostics showed one provider timeout, one reload, and a late
    `tts-line-played` event after the Live view had already unmounted.
  - Live mode now waits for the audio-priming call before requesting TTS, stops
    the persistent audio element on back/restart/unmount, and avoids treating
    expected playback cancellation as a user-facing TTS error.
  - TTS sequence progress now advances by played lines instead of requested
    lines when cancellation interrupts a sequence.
  - Audio end/error breadcrumbs now include element timing and state
    (`duration`, `currentTime`, `readyState`, `networkState`, volume/mute
    state) so future half-line reports can be measured directly.

Verification:

- Public frontend loaded through Codespaces.
- Public `/api/healthz` returned `{"status":"ok"}` through the Vite proxy.
- `/api/tts/health` returned configured when called with the access token.
- Diagnostics were received in
  `artifacts/api-server/output/diag-session-logs.jsonl`.
- Focused tests:
  - `pnpm --filter @workspace/memorize-tool exec vitest run src/hooks/useMicrophoneRecorder.test.ts src/services/openaiService.test.ts`
  - `pnpm --filter @workspace/api-server exec vitest run src/routes/audio.test.ts`
- Full verification:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`
- Additional focused frontend checks after the persistent TTS player change:
  - `pnpm --filter @workspace/memorize-tool exec vitest run src/services/openaiService.test.ts`
  - `pnpm --filter @workspace/memorize-tool run typecheck`
  - `pnpm --filter @workspace/memorize-tool run test`
  - `pnpm --filter @workspace/memorize-tool run build`

Findings from the 2026-05-04 manual Codespaces test:

- Diagnostics received: 36 records in 1 session.
- Time window: `2026-05-04T17:50:12Z` to `2026-05-04T17:51:20Z`.
- TTS generated fresh audio successfully.
- Replit Object Storage cache writes failed in Codespaces, but fresh TTS audio
  still returned to the client.
- STT succeeded once with a real audio payload.
- STT failed twice with HTTP 400 after sending 5-byte audio payloads, indicating
  empty or invalid recordings should be blocked earlier.
- Passkey registration options were requested, but a completed registration
  verify request was not observed in the logs.

## v3.0.0-beta.1

Date: 2026-05-04

Git:

- Commit: `d957791bc35c8d4b8b7e52fe40371e0d6d5b082b`
- Tag: `v3.0.0-beta.1`
- Commit message: `Migrate dev to unified Code-Memorize workspace`

Changes and decisions:

- Migrated `dev` to the unified Code-Memorize workspace.
- Replaced the older single-app structure with a pnpm workspace:
  - `artifacts/memorize-tool` for the Vite PWA frontend
  - `artifacts/api-server` for the Express API
  - `lib/*` for shared packages
- Restored TMP-style diagnostics:
  - backend diagnostic sessions and JSONL persistence
  - frontend diagnostics service
  - global app error capture
  - Live mode breadcrumbs
  - Copy debug report support
- Added `docs/feature-audit.md` to summarize known feature coverage and gaps.
- Kept `main` unchanged.

Verification:

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- Playwright public-flow E2E with video artifact:
  `artifacts/videos/diagnostics-live-mode-debug-report-e2e.webm`
