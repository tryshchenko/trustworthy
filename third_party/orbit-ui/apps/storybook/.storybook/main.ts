import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  core: { disableTelemetry: true },
  docs: { defaultName: "Docs" },
  typescript: { reactDocgen: "react-docgen-typescript" },
  async viteFinal(cfg) {
    // Resolve workspace packages to their TypeScript source for live editing.
    cfg.resolve ??= {};
    cfg.resolve.conditions = [
      "orbit-source",
      ...(cfg.resolve.conditions ?? ["module", "browser", "development|production"]),
    ];
    return cfg;
  },
};
export default config;
