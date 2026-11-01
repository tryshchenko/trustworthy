import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
  "react/jsx-runtime",
];

export default defineConfig({
  plugins: [react()],
  // Tests resolve sibling workspace packages from source (no prior build needed).
  resolve: process.env.VITEST ? { conditions: ["orbit-source"] } : undefined,
  build: {
    lib: { entry: "src/index.ts", formats: ["es"] },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      // Externalise deps (and their subpaths) so consumers dedupe them.
      external: (id) => external.some((d) => id === d || id.startsWith(`${d}/`)),
      // One output module per source module keeps the library tree-shakeable.
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
  test: {
    name: "ui",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
