import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { shareMetadataPlugin } from "./build/shareMetadata.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_API_PROXY_TARGET", "VITE_PUBLIC_SITE_URL"]);
  return {
    plugins: [react(), shareMetadataPlugin(env.VITE_PUBLIC_SITE_URL)],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
