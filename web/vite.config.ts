import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const outDir = fileURLToPath(new URL("../internal/web/dist", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // Keep the tracked placeholder so `go build` works on a fresh clone (go:embed needs the directory).
    { name: "keep-gitkeep", writeBundle: () => writeFileSync(`${outDir}/.gitkeep`, "") },
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080",
      "/js": "http://localhost:8080",
    },
  },
  build: {
    target: "es2022",
    outDir,
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/\.pnpm\/(react|react-dom|scheduler)@/.test(id)) return "react";
          if (id.includes("@tanstack")) return "vendor";
          return undefined;
        },
      },
    },
  },
  test: { environment: "node" },
} as import("vite").UserConfig);
