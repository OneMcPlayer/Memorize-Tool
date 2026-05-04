import { defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared";

export default defineConfig({
  test: {
    ...sharedTestConfig,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: { conditions: ["workspace"] },
});
