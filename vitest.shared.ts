import { defineConfig, type UserConfig } from "vitest/config";

/**
 * Shared Vitest defaults for all workspace packages.
 *
 * Each package's `vitest.config.ts` should call `defineConfig({ ... })` and
 * spread or merge from `sharedTestConfig` to inherit reporter, coverage,
 * and exclude settings.
 */
export const sharedTestConfig: UserConfig["test"] = {
  globals: false,
  reporters: ["default"],
  passWithNoTests: false,
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.turbo/**",
    "**/tests/e2e/**",
    "**/*.spec.ts",
    "**/generated/**",
  ],
  coverage: {
    provider: "v8",
    reporter: ["text", "html", "lcov"],
    reportsDirectory: "coverage",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/generated/**",
      "**/tests/e2e/**",
      "**/*.config.{ts,js,mjs}",
      "**/*.d.ts",
    ],
  },
};

export default defineConfig({
  test: sharedTestConfig,
  resolve: {
    conditions: ["workspace"],
  },
});
