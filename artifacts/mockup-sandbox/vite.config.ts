import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const rawPort = process.env.PORT;
const isBuildCommand = process.argv.some((arg) => arg === "build");

let port = 8081;
if (rawPort) {
  const parsed = Number(rawPort);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
  port = parsed;
} else if (!isBuildCommand) {
  throw new Error(
    "PORT environment variable is required for the dev/preview server.",
  );
}

const basePath = process.env.BASE_PATH ?? "/__mockup";
if (!process.env.BASE_PATH && !isBuildCommand) {
  throw new Error(
    "BASE_PATH environment variable is required for the dev/preview server.",
  );
}

const enableReplitVitePlugins =
  process.env.ENABLE_REPLIT_VITE_PLUGINS === "true";

async function loadReplitVitePlugins(): Promise<PluginOption[]> {
  if (!enableReplitVitePlugins) return [];

  const runtimeErrorOverlayPackage = "@replit/vite-plugin-runtime-error-modal";
  const cartographerPackage = "@replit/vite-plugin-cartographer";

  const runtimeErrorOverlay = await import(runtimeErrorOverlayPackage).then(
    (m) => (m as { default: () => PluginOption }).default,
  );
  const cartographer = await import(cartographerPackage).then(
    (m) =>
      (m as { cartographer: (options: { root: string }) => PluginOption })
        .cartographer,
  );

  return [
    runtimeErrorOverlay(),
    cartographer({
      root: path.resolve(import.meta.dirname, ".."),
    }),
  ];
}

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
    tailwindcss(),
    ...(await loadReplitVitePlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
