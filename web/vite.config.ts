import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Orbit UI is vendored in third_party/ and consumed from source via the
// "orbit-source" export condition, so there is no separate library build.
const outDir = fileURLToPath(new URL("../internal/web/dist", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Keep the tracked placeholder so `go build` works on a fresh clone (go:embed needs the directory).
    { name: "keep-gitkeep", writeBundle: () => writeFileSync(`${outDir}/.gitkeep`, "") },
  ],
  resolve: { conditions: ["orbit-source"] },
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/\.pnpm\/(react|react-dom|scheduler)@/.test(id)) return "react";
          if (/@radix-ui|radix-ui|@floating-ui|@tanstack/.test(id)) return "vendor";
          return undefined;
        },
      },
    },
  },
  test: { environment: "node" },
} as import("vite").UserConfig);
