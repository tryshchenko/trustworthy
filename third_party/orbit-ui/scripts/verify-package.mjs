// Verifies that the published artefacts work for an *external* consumer:
//  1. `pnpm pack` each package (exactly what npm would publish)
//  2. install the tarballs into a throwaway project outside the workspace
//  3. type-check a consumer file against the shipped .d.ts files
//  4. server-render components with the shipped ESM + check the CSS entry points
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const run = (cmd, cwd = root) => {
  try {
    return execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trim();
  } catch (e) {
    console.error(`✗ ${cmd}\n${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}`);
    process.exit(1);
  }
};

const work = mkdtempSync(join(tmpdir(), "orbit-verify-"));
const packs = join(work, "packs");
mkdirSync(packs);
for (const pkg of ["tokens", "icons", "ui"])
  run(`pnpm pack --pack-destination ${packs}`, join(root, "packages", pkg));
const tarballs = readdirSync(packs).map((f) => join(packs, f));
console.log("packed:", readdirSync(packs).join(", "));

const app = join(work, "consumer");
mkdirSync(app);
const tgz = (name) => tarballs.find((t) => t.includes(`orbit-${name}-`));
writeFileSync(
  join(app, "package.json"),
  JSON.stringify(
    {
      name: "orbit-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@orbit/tokens": `file:${tgz("tokens")}`,
        "@orbit/icons": `file:${tgz("icons")}`,
        "@orbit/ui": `file:${tgz("ui")}`,
        react: "^19.2.0",
        "react-dom": "^19.2.0",
      },
      devDependencies: {
        typescript: "~5.9.3",
        "@types/react": "^19.2.0",
        "@types/react-dom": "^19.2.0",
      },
      pnpm: {
        overrides: {
          "@orbit/tokens": `file:${tgz("tokens")}`,
          "@orbit/icons": `file:${tgz("icons")}`,
        },
      },
    },
    null,
    2,
  ),
);
writeFileSync(
  join(app, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      strict: true,
      target: "ES2022",
      lib: ["ES2023", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      noEmit: true,
      skipLibCheck: false,
      types: [],
    },
    include: ["consumer.tsx"],
  }),
);
writeFileSync(
  join(app, "consumer.tsx"),
  `import { AeroButton, Badge, GlassPanel, IssueCard, ThemeProvider, type IssueCardProps } from "@orbit/ui";
import { cssVar, themes, type ThemeName } from "@orbit/tokens";
import { OrbitLogo } from "@orbit/icons";

const props: IssueCardProps = { issueKey: "PLAT-87", title: "User authentication with SSO", priority: "high", assignee: { name: "Daniel Kim" } };
const theme: ThemeName = "scenic";
export const accent: string = cssVar("color-accent") + themes[theme].label;

export function Example() {
  return (
    <ThemeProvider defaultTheme={theme} scope="local">
      <GlassPanel variant="standard" elevation="raised">
        <OrbitLogo />
        <IssueCard {...props} />
        <Badge variant="info">Backend</Badge>
        <AeroButton>Create issue</AeroButton>
      </GlassPanel>
    </ThemeProvider>
  );
}
`,
);
run("pnpm install --ignore-workspace --silent", app);
run("pnpm exec tsc -p tsconfig.json", app);
console.log("✓ consumer type-checks against shipped declarations");

writeFileSync(
  join(app, "ssr.mjs"),
  `import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import * as ui from "@orbit/ui";
import { createRequire } from "node:module";
const html = renderToString(h(ui.ThemeProvider, { scope: "local", theme: "dark" },
  h(ui.GlassPanel, null, h(ui.IssueCard, { issueKey: "PLAT-87", title: "SSO", priority: "high" }), h(ui.AeroButton, null, "Create issue"))));
for (const needle of ['data-orbit-theme="dark"', "orb-glass", "orb-issue-card", "orb-button--aero", "PLAT-87: SSO"]) {
  if (!html.includes(needle)) throw new Error("SSR output missing " + needle);
}
const require = createRequire(import.meta.url);
for (const css of ["@orbit/tokens/tokens.css", "@orbit/ui/styles.css"]) require.resolve(css);
console.log("✓ SSR render OK (" + Object.keys(ui).length + " exports), CSS entry points resolve");
`,
);
console.log(run("node ssr.mjs", app));

// Tree-shaking: ESM output keeps one module per component.
const uiDist = join(app, "node_modules/@orbit/ui/dist/components/product/Kanban.js");
if (!existsSync(uiDist)) throw new Error("expected per-module ESM output for tree-shaking");
console.log("✓ per-module ESM output present (tree-shakeable)");
console.log("All package checks passed in", work);
