import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/storybook-static/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/node_modules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      // Orbit components forward labels/roles via props that jsx-a11y can't see through.
      "jsx-a11y/label-has-associated-control": [
        "error",
        { assert: "either", controlComponents: ["Input", "Textarea"] },
      ],
    },
  },
  {
    files: ["apps/showcase/src/**/*.{ts,tsx}"],
    ignores: ["apps/showcase/src/state/**"],
    rules: { "react-refresh/only-export-components": ["warn", { allowConstantExport: true }] },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/e2e/**", "**/*.stories.tsx", "**/vitest.setup.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  {
    files: ["**/*.{js,mjs}", "**/*.config.{ts,js}", "**/scripts/**"],
    languageOptions: { globals: { ...globals.node } },
  },
);
