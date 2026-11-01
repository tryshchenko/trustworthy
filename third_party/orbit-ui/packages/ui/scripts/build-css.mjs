// Bundles src/styles/index.css (and its relative @imports) into dist/styles.css.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const seen = new Set();

function inline(file) {
  if (seen.has(file)) return "";
  seen.add(file);
  return readFileSync(file, "utf8").replace(/^@import\s+["'](\.[^"']+)["'];\s*$/gm, (_, rel) =>
    inline(resolve(dirname(file), rel)),
  );
}

const css = inline(resolve(root, "../src/styles/index.css"));
writeFileSync(resolve(root, "../dist/styles.css"), `/* @orbit/ui styles */\n${css}`);
console.log(`@orbit/ui: wrote dist/styles.css (${(css.length / 1024).toFixed(1)} kB)`);
