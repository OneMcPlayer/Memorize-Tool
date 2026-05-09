import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// PORT and BASE_PATH are required at runtime (`vite dev` / `vite preview`) and
// are wired up by the artifact's workflow. They are optional for `vite build`,
// which only needs `BASE_PATH` (defaulted to "/") to set the static asset base.
const isBuildCommand = process.argv.some((arg) => arg === "build");

const rawPort = process.env.PORT;
let port = 5173;
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

const basePath = process.env.BASE_PATH ?? "/";
if (!process.env.BASE_PATH && !isBuildCommand) {
  // Dev/preview must be reachable at the artifact's prefix, so require an
  // explicit value rather than silently serving from "/".
  throw new Error(
    "BASE_PATH environment variable is required for the dev/preview server.",
  );
}

const apiProxyTarget = process.env.API_PROXY_TARGET;
const host = process.env.HOST?.trim() || "127.0.0.1";
const enableReplitVitePlugins =
  process.env.ENABLE_REPLIT_VITE_PLUGINS === "true";

async function loadReplitVitePlugins(): Promise<PluginOption[]> {
  if (!enableReplitVitePlugins) return [];

  const runtimeErrorOverlayPackage = "@replit/vite-plugin-runtime-error-modal";
  const cartographerPackage = "@replit/vite-plugin-cartographer";
  const devBannerPackage = "@replit/vite-plugin-dev-banner";

  const runtimeErrorOverlay = await import(runtimeErrorOverlayPackage).then(
    (m) => (m as { default: () => PluginOption }).default,
  );
  const cartographer = await import(cartographerPackage).then(
    (m) =>
      (m as { cartographer: (options: { root: string }) => PluginOption })
        .cartographer,
  );
  const devBanner = await import(devBannerPackage).then(
    (m) => (m as { devBanner: () => PluginOption }).devBanner,
  );

  return [
    runtimeErrorOverlay(),
    cartographer({
      root: path.resolve(import.meta.dirname, ".."),
    }),
    devBanner(),
  ];
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.svg",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "maskable-192x192.png",
        "maskable-512x512.png",
      ],
      manifest: {
        name: "Memorize Tool",
        short_name: "Memorize",
        description: "Practice memorizing your theatrical script lines",
        theme_color: "#4a90e2",
        background_color: "#ffffff",
        display: "standalone",
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/tts/") &&
              !url.pathname.includes("/health"),
            handler: "CacheFirst",
            options: {
              cacheName: "tts-audio-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname === "/api/healthz" ||
              url.pathname === "/api/passkey/supported",
            handler: "NetworkFirst",
            options: {
              cacheName: "api-public-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
    ...(await loadReplitVitePlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host,
    allowedHosts: true,
    proxy: apiProxyTarget
      ? {
          "/api": {
            target: apiProxyTarget,
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host,
    allowedHosts: true,
  },
});
