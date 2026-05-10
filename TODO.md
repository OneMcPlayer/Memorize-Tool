# TODO

This file tracks the remaining work for the `dev` branch after the unified
Code-Memorize migration. Keep it practical: when an item is done, move the
important decision or result to `HISTORY.md`.

## Immediate

- [x] Investigate empty voice recordings in Live mode.
  - Evidence: Codespaces test on 2026-05-04 produced two STT requests with
    `sizeBytes: 5`, both rejected upstream with HTTP 400.
  - Goal: prevent sending empty/invalid audio, surface a clear UI message, and
    add diagnostics for recorder state and blob size before upload.
  - Result: frontend now refreshes stale microphone streams, records capture
    metadata, blocks tiny captures before STT, and the API rejects tiny uploads
    before calling OpenRouter.
- [x] Decide the local/development TTS cache strategy outside Replit.
  - Evidence: TTS returned fresh audio successfully, but Replit Object Storage
    cache writes failed in Codespaces because the storage client could not
    initialize.
  - Result: backend TTS cache now supports `filesystem`, `none`, and
    `replit-object-storage`; filesystem is the portable default outside Replit.
- [ ] Finish a browser passkey registration/login check.
  - Evidence: registration options were requested during the 2026-05-04 test,
    but no completed verify request was observed in the backend logs.
  - Goal: confirm whether this is a real passkey flow issue or just an
    incomplete manual test.
- [ ] Re-run Live mode on a real browser/device and capture a short E2E video.
  - Save the artifact in `artifacts/videos/` per `AGENTS.md`.
- [ ] Re-test long TTS cue sequences on iPhone Safari.
  - Current mitigation: Live mode primes one persistent audio element from the
    `Play scene` tap and reuses it for every cue line.
  - Follow-up mitigation: Live mode now stops the persistent audio element on
    back/restart/unmount, waits for priming before starting TTS, records audio
    ended/error element timing, and only advances by played lines.
  - Goal: confirm whether this removes later-sequence `NotAllowedError`
    playback failures and the observed half-line/reload symptom.
- [ ] Re-test the `PROCESSO AL POTERE` `seduce.` cue on iPhone Safari.
  - Current mitigation: the bundled line was disambiguated as lowercase
    `seduce.`, invalid 44-byte TTS responses are ignored/retried by the API,
    and the frontend refuses tiny TTS blobs before playback.
  - Goal: confirm the cue is spoken as the Italian line and no longer causes a
    media decode error or navigation reset.

## Short Term

- [x] Add a local dev startup guide for Codespaces.
  - Include `.env.local`, Docker Postgres, `pnpm --filter @workspace/db run push`,
    API port `8080`, web port `25868`, and public Codespaces URL behavior.
- [x] Decide whether the Vite `API_PROXY_TARGET` dev proxy should stay.
  - It is useful for Codespaces because the public frontend port can proxy
    `/api` to the private API port.
  - Result: it stays as a portable dev option and remains inactive unless
    `API_PROXY_TARGET` is set.
- [ ] Add a safer diagnostics viewer or export helper.
  - Current logs persist to `artifacts/api-server/output/diag-session-logs.jsonl`.
  - Keep redaction rules strict and avoid exposing audio, transcripts, scripts,
    tokens, cookies, or API keys.
- [x] Harden Live mode TTS cancellation diagnostics.
  - Result: active TTS playback is cancelled when leaving/restarting Live mode,
    stale playback promises settle, and diagnostics now include audio element
    timing/state on end/error.
- [ ] Review mobile microphone behavior.
  - Confirm permissions, MediaRecorder MIME type, stop timing, and minimum blob
    size on mobile Chrome/Safari where rehearsal will likely happen.
  - Current mitigation: the mic stream is released after every recording stop
    so iPhone playback does not stay in a lowered capture-audio route.
- [ ] Add an explicit script/practice language setting.
  - Current Live mode sends Italian (`it`) to STT because the course scripts are
    Italian. A future setting should let imported/custom scripts choose a
    different spoken language without tying it to the UI language.
- [x] Add an option to retry wrong spoken lines.
  - Goal: after an `off` or `close` result, let the user re-record the same
    line before advancing.
  - Result: Live mode now keeps the current user line active after a close/off
    match, offers retry/continue actions, and only advances when the user
    continues or records a correct line.
- [x] Switch Live mode STT default to Chirp 3.
  - Result: backend `/audio/transcriptions` now defaults to `google/chirp-3`;
    the STT performance page compares Whisper large-v3 with Chirp 3.
- [ ] Validate the non-root VPS deployment flow on a real server.
  - Current scaffolding: `docs/vps-hermes-prompt.md` and `deploy/vps/`.
  - Goal: confirm HTTPS reverse proxy, passkeys, diagnostics persistence,
    filesystem TTS cache, database migrations, service restart, and the
    `dev` branch auto-update timer.
  - 2026-05-10 decision: because only `epicserver.vpsgh.it` DNS is available,
    use `/` for production and `/dev/` for staging instead of subdomains.
- [x] Add focused tests for empty audio handling.
  - Backend: reject tiny/empty audio with a clear error before provider call.
  - Frontend: do not call STT if the recorded blob is too small.
- [ ] Decide whether Replit optional dependencies should remain installed by
      default or move to a separate platform package/profile.

## Later

- [ ] Complete feature audit against the old `main`, `dev`, TMP, and
      Code-Memorize target versions.
- [ ] Explore a fast reveal-only practice mode.
  - Intended behavior: outside Zen mode, play partner TTS faster, skip user
    recording, and show a button to reveal the correct user line.
- [x] Decide the production deployment shape.
  - Result: use Caddy on `epicserver.vpsgh.it`, route production at `/`, and
    route staging at `/dev/` with separate localhost ports and data stores.
- [ ] Review generated `dist/` artifacts and ignore policy.
- [ ] Confirm whether diagnostics should be memory-only, file-backed, or
      database-backed in production.
- [ ] Add a release checklist for future theatrical-course yearly updates.
