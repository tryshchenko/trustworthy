import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev we resolve workspace packages to their TypeScript source (the
// "orbit-source" export condition) for instant HMR. Production builds consume
// the compiled `dist/` output exactly as an external app would.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    conditions: command === "serve" ? ["orbit-source"] : [],
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Stable vendor chunks cache well across deploys of the app code.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/\.pnpm\/(react|react-dom|scheduler)@/.test(id)) return "react";
          if (/@radix-ui|radix-ui|@floating-ui|@dnd-kit|@tanstack/.test(id)) return "vendor";
          return undefined;
        },
      },
    },
  },
}));
