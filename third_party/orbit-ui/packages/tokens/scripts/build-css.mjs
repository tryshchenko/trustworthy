// Generates dist/tokens.css and dist/tokens.json from the compiled TypeScript source.
import { writeFileSync } from "node:fs";
import { buildTokenCss, buildTokenJson } from "../dist/index.js";

const out = new URL("../dist/", import.meta.url);
writeFileSync(new URL("tokens.css", out), buildTokenCss());
writeFileSync(new URL("tokens.json", out), JSON.stringify(buildTokenJson(), null, 2) + "\n");
console.log("@orbit/tokens: wrote dist/tokens.css and dist/tokens.json");
