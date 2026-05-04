import { defineConfig } from "vitest/config";
import path from "node:path";
import { sharedTestConfig } from "../../vitest.shared";

export default defineConfig({
  test: {
    ...sharedTestConfig,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: [...(sharedTestConfig?.exclude ?? []), "tests/e2e/**"],
  },
  resolve: {
    conditions: ["workspace"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
