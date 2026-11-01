import {
  densities,
  densityTokenNames,
  type DensityName,
  type DensityTokenName,
} from "./density.js";
import {
  blur,
  breakpoints,
  duration,
  easing,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  palette,
  radius,
  space,
  zIndex,
} from "./primitives.js";
import {
  semanticTokenNames,
  themeNames,
  themes,
  type SemanticTokenName,
  type ThemeName,
} from "./themes.js";

export * from "./primitives.js";
export * from "./density.js";
export * from "./themes.js";

/** Prefix used for every Orbit custom property. */
export const TOKEN_PREFIX = "orb";

/* --------------------------------------------------------------------------
 * Static (theme-independent) tokens
 * ------------------------------------------------------------------------ */

function prefixed<K extends string>(group: string, record: Record<K, string>) {
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [`${group}-${k}`, v as string]),
  ) as Record<`${string}-${K}`, string>;
}

/** Theme-independent tokens, keyed by custom property name (without `--orb-`). */
export const staticTokens: Record<string, string> = {
  ...prefixed("font", fontFamily),
  ...prefixed("text", fontSize),
  ...prefixed("weight", fontWeight),
  ...prefixed("leading", lineHeight),
  ...prefixed("tracking", letterSpacing),
  ...prefixed("space", space),
  ...prefixed("radius", radius),
  ...prefixed("blur", blur),
  ...prefixed("duration", duration),
  ...prefixed("ease", easing),
  ...prefixed("z", zIndex),
};

/** Typographic roles. Each maps to size / line-height / weight / tracking tokens. */
export const typeStyles = {
  "page-title": {
    size: fontSize["4xl"],
    leading: lineHeight.tight,
    weight: fontWeight.semibold,
    tracking: letterSpacing.tight,
  },
  "section-title": {
    size: fontSize.xl,
    leading: lineHeight.snug,
    weight: fontWeight.semibold,
    tracking: letterSpacing.snug,
  },
  "card-title": {
    size: fontSize.md,
    leading: lineHeight.snug,
    weight: fontWeight.medium,
    tracking: letterSpacing.normal,
  },
  body: {
    size: fontSize.md,
    leading: lineHeight.normal,
    weight: fontWeight.regular,
    tracking: letterSpacing.normal,
  },
  "body-strong": {
    size: fontSize.md,
    leading: lineHeight.normal,
    weight: fontWeight.semibold,
    tracking: letterSpacing.normal,
  },
  meta: {
    size: fontSize.xs,
    leading: lineHeight.snug,
    weight: fontWeight.medium,
    tracking: letterSpacing.normal,
  },
  overline: {
    size: fontSize["2xs"],
    leading: lineHeight.snug,
    weight: fontWeight.semibold,
    tracking: letterSpacing.wide,
  },
} as const;
export type TypeStyle = keyof typeof typeStyles;

/* --------------------------------------------------------------------------
 * Typed CSS variable references
 * ------------------------------------------------------------------------ */

export type TokenName = SemanticTokenName | DensityTokenName | keyof typeof staticTokens;

/** `cssVar("color-accent")` → `"var(--orb-color-accent)"` */
export function cssVar(
  name: SemanticTokenName | DensityTokenName | (string & {}),
  fallback?: string,
) {
  return fallback
    ? `var(--${TOKEN_PREFIX}-${name}, ${fallback})`
    : `var(--${TOKEN_PREFIX}-${name})`;
}

/** Custom property name: `propName("color-accent")` → `"--orb-color-accent"` */
export function propName(name: string) {
  return `--${TOKEN_PREFIX}-${name}`;
}

/** Map of every semantic token to its `var(--orb-…)` reference, for CSS-in-JS consumers. */
export const vars = Object.fromEntries(
  [...semanticTokenNames, ...densityTokenNames].map((n) => [n, cssVar(n)]),
) as Record<SemanticTokenName | DensityTokenName, string>;

/* --------------------------------------------------------------------------
 * CSS generation
 * ------------------------------------------------------------------------ */

function declarations(record: Record<string, string>, indent = "  ") {
  return Object.entries(record)
    .map(([k, v]) => `${indent}${propName(k)}: ${v};`)
    .join("\n");
}

const typeStyleTokens = Object.fromEntries(
  Object.entries(typeStyles).flatMap(([role, s]) => [
    [`type-${role}-size`, s.size],
    [`type-${role}-leading`, s.leading],
    [`type-${role}-weight`, s.weight],
    [`type-${role}-tracking`, s.tracking],
  ]),
);

const paletteTokens = Object.fromEntries(
  Object.entries(palette).flatMap(([hue, scale]): [string, string][] =>
    typeof scale === "string"
      ? [[`palette-${hue}`, scale]]
      : Object.entries(scale).map(([step, v]): [string, string] => [`palette-${hue}-${step}`, v]),
  ),
);

/**
 * Build the complete token stylesheet.
 *
 * - `:root` holds static tokens, palette, the default theme and density.
 * - `[data-orbit-theme]` / `[data-orbit-density]` scope overrides to any subtree.
 * - Media queries honour reduced motion and reduced transparency.
 */
export function buildTokenCss(): string {
  const parts: string[] = [];
  parts.push(`/* @orbit/tokens — generated file, do not edit. */`);
  parts.push(
    `:root {\n${declarations(staticTokens)}\n${declarations(typeStyleTokens)}\n${declarations(paletteTokens)}\n}`,
  );
  for (const name of themeNames) {
    const t = themes[name];
    const selector =
      name === "minimal" ? `:root,\n[data-orbit-theme="minimal"]` : `[data-orbit-theme="${name}"]`;
    parts.push(`${selector} {\n  color-scheme: ${t.colorScheme};\n${declarations(t.tokens)}\n}`);
  }
  // Chrome overrides: applied to elements marked `data-orbit-chrome` inside a theme.
  const chromeSel = (name: string) =>
    `[data-orbit-theme="${name}"] [data-orbit-chrome],\n[data-orbit-theme="${name}"][data-orbit-chrome]`;
  for (const name of themeNames) {
    const t = themes[name];
    if (!t.chrome) continue;
    const scheme = t.chromeColorScheme ? `  color-scheme: ${t.chromeColorScheme};\n` : "";
    parts.push(
      `${chromeSel(name)} {\n${scheme}${declarations(t.chrome as Record<string, string>)}\n}`,
    );
  }
  for (const d of Object.keys(densities) as DensityName[]) {
    const selector =
      d === "comfortable"
        ? `:root,\n[data-orbit-density="comfortable"]`
        : `[data-orbit-density="${d}"]`;
    parts.push(`${selector} {\n${declarations(densities[d])}\n}`);
  }
  const opaqueGlass = (bg: string) => ({
    "glass-subtle-bg": bg,
    "glass-standard-bg": bg,
    "glass-raised-bg": bg,
    "glass-blur-subtle": "0px",
    "glass-blur-standard": "0px",
    "glass-blur-raised": "0px",
    "glass-sheen": "none",
  });
  const reducedTransparency = `:root:not([data-orbit-theme="dark"]),\n  [data-orbit-theme="minimal"],\n  [data-orbit-theme="scenic"] {\n${declarations(opaqueGlass("#FFFFFF"), "    ")}\n    --orb-color-surface-column: #EEF4F9;\n  }\n  [data-orbit-theme="dark"] {\n${declarations(opaqueGlass("#0F2440"), "    ")}\n    --orb-color-surface-column: #0B1E36;\n  }`;
  parts.push(`@media (prefers-reduced-transparency: reduce) {\n  ${reducedTransparency}\n}`);
  parts.push(
    `[data-orbit-transparency="reduced"] {\n${declarations(opaqueGlass("var(--orb-color-surface-solid)"))}\n  --orb-color-surface-column: var(--orb-color-surface-sunken);\n}`,
  );
  // Reduced transparency also applies inside themed chrome (which redefines glass).
  for (const name of themeNames) {
    const t = themes[name];
    if (!t.chrome) continue;
    const fill = t.chrome["color-surface-solid"] ?? "var(--orb-color-surface-solid)";
    const decl = declarations(opaqueGlass(fill), "    ");
    parts.push(
      `@media (prefers-reduced-transparency: reduce) {\n  ${chromeSel(name).replace(/\n/g, "\n  ")} {\n${decl}\n  }\n}`,
    );
    const reducedSel = [
      `[data-orbit-theme="${name}"][data-orbit-transparency="reduced"] [data-orbit-chrome]`,
      `[data-orbit-transparency="reduced"] [data-orbit-theme="${name}"] [data-orbit-chrome]`,
    ].join(",\n");
    parts.push(`${reducedSel} {\n${declarations(opaqueGlass(fill))}\n}`);
  }
  const noMotion = Object.fromEntries(Object.keys(duration).map((k) => [`duration-${k}`, "0ms"]));
  parts.push(
    `@media (prefers-reduced-motion: reduce) {\n  :root {\n${declarations(noMotion, "    ")}\n  }\n}`,
  );
  parts.push(`[data-orbit-motion="reduced"] {\n${declarations(noMotion)}\n}`);
  return parts.join("\n\n") + "\n";
}

/** A plain-object export of every token, used to generate `tokens.json` and docs. */
export function buildTokenJson() {
  return {
    palette,
    static: staticTokens,
    typeStyles,
    breakpoints,
    densities,
    themes: Object.fromEntries(themeNames.map((n) => [n, themes[n].tokens])),
    chrome: Object.fromEntries(
      themeNames.filter((n) => themes[n].chrome).map((n) => [n, themes[n].chrome]),
    ),
  };
}

export type { ThemeName, DensityName };
export * from "./contrast.js";
