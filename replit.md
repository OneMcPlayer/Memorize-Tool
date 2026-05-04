# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Memorize Tool (`artifacts/memorize-tool`)
- **Kind**: React + Vite web app + PWA
- **Preview path**: `/`
- **Port**: set by workflow via `PORT` env var (with `BASE_PATH=/`)
- **Source**: Migrated from https://github.com/OneMcPlayer/Memorize-Tool (dev branch v2.6.0-beta.2)
- **Purpose**: Script memorization tool for actors — select a script from the built-in library, choose your character, practice lines (passive reveal mode OR interactive voice mode with TTS playback + STT word-accuracy evaluation).
- **Backend**: extends `artifacts/api-server` (Express 5 on `/api`).
  - `GET /api/healthz`, `GET /api/passkey/supported`
  - `POST /api/passkey/register/options` + `/register/verify` — real WebAuthn registration via `@simplewebauthn/server`
  - `POST /api/passkey/authenticate/options` + `/authenticate/verify` — real WebAuthn authentication (returns a JWT signed with `SESSION_SECRET`, HS256, 24h)
  - `POST /api/passkey/refresh`, `POST /api/passkey/logout`, `POST /api/user/logout` (alias)
  - `GET /api/user/me`, `GET /api/passkey/count` — user profile + registered-passkey count (auth required). The OpenAI API key is intentionally NOT persisted server-side; it lives only in `localStorage` on the client and is sent per-request to `/api/tts/*` and `/api/audio/transcriptions`.
  - `GET /api/scripts`, `GET /api/scripts/:id` — built-in script catalog served from `@workspace/scripts-data` (20 scripts).
  - `GET /api/tts/health`, `POST /api/tts/speech` — OpenAI TTS proxy with cache in Replit Object Storage (`@replit/object-storage`). Cache key is `tts/<sha256(text|model|voice|speed)>.<ext>` in the default bucket (`DEFAULT_OBJECT_STORAGE_BUCKET_ID`). SHA-256 was chosen over MD5 for collision resistance; a single bucket with a `tts/` prefix avoids extra bucket provisioning.
  - `POST /api/audio/transcriptions` — OpenAI Whisper STT proxy (multipart upload via `multer`, forwards using user's API key)
  - **Session auth**: tokens are JWTs (HS256, signed with `SESSION_SECRET`) carrying `{userId, jti, exp}`. The `requireAuth` middleware verifies the JWT signature/expiry against `SESSION_SECRET`, then looks up the `jti` in the `tokens` table to enforce server-side revocation. Logout deletes the row by `jti`. The `tokens` table stores only the `jti` (no opaque secret).
  - Body limit raised to `10mb` to accommodate audio uploads
  - **WebAuthn challenge binding**: each verify endpoint extracts the signed challenge from `clientDataJSON`, then atomically `DELETE … RETURNING` the matching row from `webauthnChallenges` (single-use, race-safe). RPID/origin are derived from the request (overridable with `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` env).
- **PWA**: `vite-plugin-pwa` (autoUpdate). Manifest in vite config; service worker generated to `dist/public/sw.js`. Runtime caching scoped to non-sensitive endpoints: `CacheFirst` for `/api/tts/*` (audio is non-sensitive, dedupes repeat playback), `NetworkFirst` for `/api/healthz` and `/api/passkey/supported`. Authenticated endpoints (`/api/user`, `/api/passkey/*` ceremony) are intentionally NOT cached so user data cannot leak across sessions on shared devices. No mobile nav bar.

#### Frontend key files:
- `src/App.tsx` — root wrapped in `AuthProvider` + `AppProvider`; views: INPUT, PRACTICE, SCRIPT_MEMORIZATION_PRACTICE, CONVERTER, ABOUT, PROFILE, AUDIO_TEST, TTS_TEST. Renders `OfflineIndicator` + `InstallPrompt`.
- `src/context/AppContext.tsx` — global state (language, dark mode, script lines, practice state)
- `src/context/AuthContext.tsx` — passkey auth (login/register/logout/refresh); localStorage `authToken`/`authTokenExpires`/`authUser`; 5-minute background refresh
- `src/services/openaiService.ts` — TTS via `/api/tts/speech` proxy; STT direct to OpenAI `/v1/audio/transcriptions` with user's API key from localStorage. Voices: alloy/ash/ballad/coral/echo/fable/onyx/nova/sage/shimmer/verse (default `coral`). Models: `standard`/`hd`/`advanced` (default `hd`).
- `src/services/passkeyService.ts` — `@simplewebauthn/browser` register/login against `/api/passkey/*`
- `src/hooks/useMicrophoneRecorder.ts` — MediaRecorder wrapper with permission management
- `src/components/UserProfile.tsx` — passkey register/login UI + profile display
- `src/components/common/ApiKeyInput.tsx` — OpenAI key input; stores the key in `localStorage("openai_api_key")` only. There is no server-side persistence (the prior `/api/user/api-key` routes were removed to honor the spec).
- `src/components/common/OfflineIndicator.tsx` — banner when `navigator.onLine` is false
- `src/components/common/InstallPrompt.tsx` — PWA install prompt
- `src/components/common/ServerStatusBadge.tsx` — `/api/healthz` polling badge
- `src/components/views/ScriptMemorizationPractice.tsx` — intro/landing for interactive practice
- `src/components/views/InteractiveMemorizationView.tsx` — TTS playback of other characters + auto-record user line + STT evaluation (word-accuracy ≥ 0.8 = correct)
- `src/data/translations.ts` — English + Italian UI strings (now includes memorization, passkey, install/offline keys)
- `src/data/scripts/index.ts` — 20+ Italian theatre script JSON catalog + loader
- `src/utils/index.ts` — clipboard, toast, file reading helpers
- `src/utils/ttsService.ts` — legacy Web Speech API + Google TTS (used by simple PracticeView reader)
- `src/components/layout/Header.tsx` — language selector, dark mode toggle, profile/login button (👤/🔑), options menu
- `src/components/views/InputView.tsx` — step-by-step script/character/context setup with two CTAs: classic Practice and Memorization Practice (🎭) in both basic + advanced modes
- `src/components/views/PracticeView.tsx` — line-by-line practice with reveal/verify/skip
- `src/components/views/ConverterView.tsx` — plain-text → structured script converter
- `src/components/views/AboutView.tsx` — about page
- `src/components/common/ScriptModal.tsx` — full script viewer modal
- `src/components/common/ScriptReader.tsx` — legacy TTS script reader
- `src/components/test/AudioTestComponent.tsx`, `TtsTestPage.tsx` — diagnostics

#### Database (lib/db schemas):
- `users`, `passkeys` (id/userId/publicKey/counter/transports/lastUsed), `tokens` (stores the JWT `jti` + expiresAt for server-side revocation; the JWT itself is not stored), `webauthnChallenges` (challenge/kind/username/expiresAt — consumed atomically on verify). `userSettings` is reserved for future per-user voice prefs; the `openaiApiKey` column is unused by the application now that the key is browser-local.

#### Schema deployment:
- This repo uses `drizzle-kit push` rather than checked-in migration files. The post-merge script (`scripts/post-merge.sh`) runs `pnpm install --frozen-lockfile && pnpm --filter db push` automatically after every task merge, so fresh deploys pick up the new auth tables without manual steps. For local development, run `pnpm --filter @workspace/db run push` after editing schema.

#### Shared libs:
- `lib/scripts-data` (`@workspace/scripts-data`) — script catalog metadata + JSON content. Imported by both the frontend (`artifacts/memorize-tool/src/data/scripts/index.ts` re-exports it) and the API server (`/api/scripts` routes), satisfying the workspace rule that artifacts cannot import from each other.

#### Access gate scope:
The `AccessGate` (codice d'accesso, validated against `MAIN_ACCESS_TOKEN` via `/api/access/verify`) only wraps the **live mode** view (`InteractiveMemorizationView`, rendered from `ScriptMemorizationPractice` once the user clicks "Inizia"). All other views — InputView, PracticeView, ConverterView, AboutView, UserProfile, AudioTest, TtsTest — are reachable without a code. The gate is `position: fixed; inset: 0;` so wrapping it around a single view still produces a full-screen lock when triggered. The token is persisted in `localStorage("mainAccessToken")` and is sent as `X-Access-Token` on the live-mode TTS/STT calls; once unlocked it stays unlocked across sessions until the server returns 401.

#### Per-line cue tags (replaces the old Studio Mode):
The earlier global "Studio Mode" voice-instructions feature was removed in favor of per-line cue tags. The user adds free-form bracketed tags (e.g. `[whisper] [slow]`) per cue line of other characters; the tag is prepended to the TTS input for that line only. Tags are persisted server-side per `(user, script)` in `user_settings.line_tags` (jsonb) via `GET/PUT /api/user/line-tags` (`routes/lineTags.ts`, `requireAuth`). Client: `services/lineTagsService.ts`, `components/common/LineTagsModal.tsx`, integrated in `InteractiveMemorizationView` via the 🏷️ button (auth only). Tag is included in the audio cache key.

#### Mobile responsiveness policy:
The Memorize Tool is used on phones during rehearsal. All view + modal CSS must obey:
- **Canonical breakpoints**: `480px` (phone portrait), `640px` (large phone / small tablet, used for the options sheet), `768px` (tablet portrait / phone landscape). Nest mobile rules in `@media (max-width: ...)` only — never overwrite the desktop default.
- **Tap targets ≥ 44×44 CSS px** on touch devices: enforced globally in `src/index.css` via `@media (hover: none)` for `#themeToggle`, `#optionsToggle`, `#profileToggle`, `#languageSelect`. New header icons or modal close buttons must extend that block.
- **Inputs ≥ 16px font-size on mobile** (≤768px): enforced globally in `src/index.css` for `input[type=text|email|password|number|search|tel|url]`, `textarea`, `select`. This prevents iOS Safari from auto-zooming on focus. New custom inputs must either inherit or repeat the rule.
- **Safe-area insets**: full-screen modals and sheets that touch the bottom edge on mobile (options-modal, VoiceAssignmentModal footer, AccessGate) use `padding-bottom: max(<n>, env(safe-area-inset-bottom))` so iOS home indicator doesn't cover CTAs.
- **Modal scrollability**: every dialog must have `max-height: <90vh|92dvh>` + `overflow-y: auto` on its body so it fits iPhone SE landscape (320×568) and small portrait without trapping the close/submit button.
- **No horizontal scroll** at 320px / 375px / 414px viewports. Use `flex-wrap: wrap`, `min-width: 0`, and `overflow-wrap: anywhere` rather than fixed widths.
