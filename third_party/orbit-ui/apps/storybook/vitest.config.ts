import react from "@vitejs/plugin-react";
import { defineProject } from "vitest/config";

// Runs every story's play function in jsdom (interaction tests) via composeStories.
export default defineProject({
  plugins: [react()],
  resolve: { conditions: ["orbit-source"] },
  test: {
    name: "storybook",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["stories/**/*.test.tsx"],
    css: false,
    testTimeout: 15000,
  },
});
