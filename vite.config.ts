import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages project sites are served under /<repository>/.
  // Relative asset URLs keep the PWA working on both Pages and a custom domain.
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "BlueChart Check",
        short_name: "BlueChart",
        description: "青チャート例題の個人用チェックシート",
        theme_color: "#0b63ce",
        background_color: "#f4f8ff",
        display: "standalone",
        start_url: "./",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallback: "index.html"
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"]
  }
});
