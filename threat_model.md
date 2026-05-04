# Threat Model

## Project Overview

Memorize Tool is a TypeScript pnpm workspace with a React/Vite/PWA frontend (`artifacts/memorize-tool`), an Express 5 API server (`artifacts/api-server`), shared generated API libraries, a Drizzle/PostgreSQL database layer (`lib/db`), and a shared built-in theatre script catalog (`lib/scripts-data`). Users practice memorizing scripts, can create passwordless passkey accounts, and can use live TTS/STT features backed by OpenRouter via a server-side `OPENROUTER_API_KEY`.

Production scope includes the API server, the Memorize Tool frontend, shared libraries, generated API clients/schemas, database schemas, PWA service worker configuration, and build/runtime configuration used by deployments. The mockup sandbox is development-only and should be ignored unless production reachability is demonstrated. In production, `NODE_ENV` is assumed to be `production`, and deployed traffic is protected by platform TLS.

## Assets

- **User accounts and sessions** -- WebAuthn passkey credentials, public keys, counters, JWT session tokens, token `jti` records, usernames, and optional emails. Compromise allows account impersonation or denial of account access.
- **WebAuthn ceremony state** -- registration/authentication challenges in PostgreSQL. Replay or weak binding could let attackers complete ceremonies they did not initiate.
- **Application secrets** -- `SESSION_SECRET`, `DATABASE_URL`, `OPENROUTER_API_KEY`, and object-storage credentials. Leakage enables token forgery, database access, or unauthorized external API spending.
- **External API quota and billing** -- OpenRouter TTS/STT requests are paid or quota-bound server-side operations and must be protected from abuse.
- **User-provided practice content and audio** -- custom scripts, recorded audio blobs, transcriptions, and generated speech may contain private content. The app should avoid unnecessary persistence or disclosure.
- **Built-in script catalog and generated audio cache** -- public script content and cached TTS audio in object storage. Integrity and cost/resource controls matter even if the content itself is not secret.

## Trust Boundaries

- **Browser to API** -- all `/api/*` requests come from an untrusted client. The server must validate bodies, enforce authentication/authorization where required, and not trust localStorage state.
- **Unauthenticated to authenticated API boundary** -- passkey registration/login, health, scripts, and live media proxies are publicly reachable; `/api/user/me`, session refresh/logout/count, and any future user data routes require valid bearer JWTs and token-table revocation checks.
- **API to PostgreSQL** -- Express routes use Drizzle ORM over `DATABASE_URL`. SQL injection or overly broad queries could expose or modify account/session state.
- **API to OpenRouter** -- the server forwards TTS/STT requests using `OPENROUTER_API_KEY`. Public clients must not be able to use this boundary as an unlimited anonymous paid proxy.
- **API to Object Storage** -- TTS output is cached under deterministic keys. Cache writes and reads must not permit unbounded storage growth or cross-user sensitive-data leakage.
- **Frontend storage boundary** -- JWTs and cached user profile data live in browser `localStorage`; any XSS in the app would expose sessions.
- **Production vs development** -- `artifacts/mockup-sandbox`, Vite dev plugins, and dev/preview-only host settings are out of production scope unless proven reachable in production.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts`, `src/index.ts`, and `src/routes/*` under `/api`.
- Authentication/session anchors: `artifacts/api-server/src/routes/passkey.ts`, `src/lib/sessionJwt.ts`, `src/middleware/requireAuth.ts`, `lib/db/src/schema/{users,passkeys,tokens,webauthnChallenges}.ts`, `artifacts/memorize-tool/src/context/AuthContext.tsx`, and `src/services/passkeyService.ts`.
- External API and upload anchors: `artifacts/api-server/src/routes/tts.ts`, `src/routes/audio.ts`, `src/lib/ttsStorage.ts`, `artifacts/memorize-tool/src/services/openaiService.ts`, and PWA caching in `artifacts/memorize-tool/vite.config.ts`.
- Public content anchors: `artifacts/api-server/src/routes/scripts.ts` and `lib/scripts-data`.
- Frontend XSS/session exposure anchors: `artifacts/memorize-tool/src/components`, `src/data/translations.ts`, localStorage uses, `dangerouslySetInnerHTML`, and generated API client fetch behavior.
- Dev-only: `artifacts/mockup-sandbox` and Vite/Replit dev plugins gated out by `NODE_ENV === "production"`.

## Threat Categories

### Spoofing

Users authenticate with WebAuthn passkeys and receive HS256 JWTs signed with `SESSION_SECRET`. The API must validate WebAuthn origin/RP ID/challenges for each ceremony, sign tokens only after verified credentials, and verify both JWT signature/expiry and a live token-table `jti` before accepting protected API requests. Session tokens must be unpredictable, revocable, and rotated safely.

### Tampering

The browser is untrusted. Usernames, route parameters, TTS text/model/voice/speed values, uploaded audio metadata, and generated API client requests must be validated server-side. WebAuthn challenges must be single-use and bound to the intended ceremony. Database access must remain parameterized through Drizzle or equivalent safe APIs.

### Information Disclosure

The API must not expose `SESSION_SECRET`, `DATABASE_URL`, `OPENROUTER_API_KEY`, stack traces, internal provider details beyond safe health status, or private user/account data. Browser localStorage contains bearer tokens, so frontend-rendered HTML and style injection surfaces must remain tightly controlled. TTS/STT requests may contain private scripts/audio and should not be logged or cached in ways that expose user content to others.

### Denial of Service

Public routes, especially passkey ceremonies, TTS generation, STT uploads, object-storage caching, and large JSON/body parsing, can consume CPU, memory, database rows, storage, and external API quota. Expensive operations must have authentication and/or rate limits, bounded request sizes, upstream timeouts, and cleanup for temporary state and cached artifacts.

### Elevation of Privilege

Protected endpoints must derive user identity only from verified sessions, not from client-supplied IDs or cached frontend state. Passkey credential IDs, counters, and user IDs must remain bound server-side so an attacker cannot authenticate as another user or query another user's records. Future admin or user-data routes must enforce authorization on the server, not only in React UI state.
