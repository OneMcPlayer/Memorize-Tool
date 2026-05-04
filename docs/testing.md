# Testing guide

This monorepo uses [Vitest](https://vitest.dev) for unit tests across every
workspace package. Playwright e2e tests live in
`artifacts/memorize-tool/tests/e2e` and are run separately via
`pnpm --filter @workspace/memorize-tool run test:e2e`.

## Running tests

From the repo root:

```bash
pnpm run test                # run every package's `test` script
pnpm run test:coverage       # same, plus a v8 coverage report per package
```

Per package:

```bash
pnpm --filter @workspace/api-zod run test
pnpm --filter @workspace/memorize-tool run test:watch
```

All unit tests are deterministic and offline — no Postgres, no OpenAI, no
object storage. Network and storage clients are mocked.

## File layout

- Co-locate tests next to the code under test, named `*.test.ts`
  (e.g. `wordDiff.ts` ↔ `wordDiff.test.ts`).
- Test setup files live in each package's `tests/` directory
  (`tests/setup.ts`).
- The Playwright spec stays under `artifacts/memorize-tool/tests/e2e/` and
  is excluded from Vitest by the shared config (`tests/e2e/**`,
  `**/*.spec.ts`).

## Shared config

The root `vitest.shared.ts` exports `sharedTestConfig` with the common
reporter, exclude list, and v8 coverage settings. Each package's
`vitest.config.ts` imports it, then layers on its own `environment`
(`node` or `jsdom`), `setupFiles`, and resolve aliases.

To add a new package to the suite:

1. Add `vitest` and `@vitest/coverage-v8` from the catalog as
   `devDependencies`.
2. Create a `vitest.config.ts` that spreads `sharedTestConfig`.
3. Add `"test": "vitest run"` and `"test:watch": "vitest"` to the
   package's `package.json`.

## Mocking conventions

- Use `vi.stubGlobal("fetch", ...)` for client-side `fetch` mocks; the
  shared `tests/setup.ts` calls `vi.unstubAllGlobals()` after each test.
- Use `vi.mock("module-path", factory)` to swap out modules (e.g.
  `@replit/object-storage`, `@workspace/db`) before they are imported by
  the unit under test.
- For Express routes, mount the router under test directly on a fresh
  `express()` instance and drive it with `supertest` — never start a
  real HTTP server.
- For browser-only globals (e.g. `MediaRecorder`, `navigator.mediaDevices`),
  install fakes in `beforeEach` and remove them in `afterEach` so tests
  stay isolated.

## CI expectations

`pnpm run test` exits non-zero on any failure and requires no external
services, so it is safe to wire into CI unchanged.

### GitHub Actions

The `.github/workflows/ci.yml` workflow runs on every push and pull
request. It:

1. Installs pnpm (pinned to the same major version used locally) and
   Node.js 24, with pnpm's store cached between runs.
2. Installs dependencies with `pnpm install --frozen-lockfile`.
3. Runs `pnpm run typecheck` followed by `pnpm run test:coverage`.
4. Uploads any `coverage/` directories produced by per-package Vitest
   runs as a `coverage` workflow artifact (retained for 14 days) so they
   can be downloaded for inspection.

A failing typecheck or test fails the workflow and blocks the merge.
