import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/tokens", "packages/ui", "apps/storybook"],
  },
});
