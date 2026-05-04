import { defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared";

export default defineConfig({
  test: {
    ...sharedTestConfig,
    environment: "node",
  },
  resolve: { conditions: ["workspace"] },
});
