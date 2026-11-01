import { palette as p } from "./primitives.js";

/** Convert a #RRGGBB hex to an rgba() string. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const tones = ["info", "success", "warning", "danger", "neutral", "discovery", "teal"] as const;
export type Tone = (typeof tones)[number];
export const toneNames: readonly Tone[] = tones;

/**
 * Every semantic token a theme must define. Emitted as `--orb-<name>`.
 * Keep this list the single source of truth: the TS types, the generated CSS and
 * the token docs are all derived from it.
 */
export const semanticTokenNames = [
  // Canvas & text
  "color-canvas",
  "color-canvas-image",
  "color-text-primary",
  "color-text-secondary",
  "color-text-tertiary",
  "color-text-disabled",
  "color-text-inverse",
  "color-text-link",
  "color-text-on-accent",
  // Borders
  "color-border-subtle",
  "color-border-default",
  "color-border-strong",
  "color-border-focus",
  // Opaque surfaces
  "color-surface-solid",
  "color-surface-raised",
  "color-surface-sunken",
  "color-surface-hover",
  "color-surface-pressed",
  "color-surface-selected",
  "color-surface-selected-border",
  "color-surface-column",
  "color-overlay",
  // Accent
  "color-accent",
  "color-accent-hover",
  "color-accent-active",
  "color-accent-soft",
  "color-accent-soft-hover",
  "color-accent-text",
  "color-accent-gradient",
  "color-accent-gradient-hover",
  "color-accent-glow",
  // Tones (bg = soft fill, fg = AA text on bg, border, solid = strong fill / icon)
  ...tones.flatMap(
    (t) => [`color-${t}-bg`, `color-${t}-fg`, `color-${t}-border`, `color-${t}-solid`] as const,
  ),
  // Glass materials
  "glass-subtle-bg",
  "glass-standard-bg",
  "glass-raised-bg",
  "glass-border",
  "glass-border-outer",
  "glass-highlight",
  "glass-sheen",
  "glass-blur-subtle",
  "glass-blur-standard",
  "glass-blur-raised",
  "glass-saturate",
  // Elevation
  "shadow-xs",
  "shadow-sm",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-glow",
  "focus-ring",
  // Scenic background
  "scene-sky-top",
  "scene-sky-bottom",
  "scene-glow-a",
  "scene-glow-b",
  "scene-ribbon",
  "scene-hill-near",
  "scene-hill-far",
  "scene-intensity",
  "scene-aurora-a",
  "scene-aurora-b",
  "scrollbar-thumb",
] as const;

export type SemanticTokenName = (typeof semanticTokenNames)[number];
export type ThemeName = "minimal" | "scenic" | "dark" | "accessible";
export type ThemeTokens = Record<SemanticTokenName, string>;

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  description: string;
  colorScheme: "light" | "dark";
  tokens: ThemeTokens;
  /**
   * Optional overrides for application *chrome* (sidebar, header — anything marked
   * `data-orbit-chrome`). Lets a theme pair dark glass frames with light content,
   * and keeps that pairing token-driven and contrast-tested.
   */
  chrome?: Partial<ThemeTokens>;
  /** Colour scheme of the chrome when it differs from the theme's. */
  chromeColorScheme?: "light" | "dark";
}

/* --------------------------------------------------------------------------
 * Shared light-mode building blocks
 * ------------------------------------------------------------------------ */

const lightTones = {
  "color-info-bg": p.blue[50],
  "color-info-fg": p.blue[700],
  "color-info-border": p.blue[200],
  "color-info-solid": p.blue[600],
  "color-success-bg": p.green[50],
  "color-success-fg": p.green[700],
  "color-success-border": p.green[200],
  "color-success-solid": p.green[500],
  "color-warning-bg": p.amber[50],
  "color-warning-fg": p.amber[800],
  "color-warning-border": p.amber[200],
  "color-warning-solid": p.amber[500],
  "color-danger-bg": p.red[50],
  "color-danger-fg": p.red[700],
  "color-danger-border": p.red[200],
  "color-danger-solid": p.red[600],
  "color-neutral-bg": p.slate[50],
  "color-neutral-fg": p.slate[700],
  "color-neutral-border": p.slate[200],
  "color-neutral-solid": p.slate[500],
  "color-discovery-bg": p.violet[50],
  "color-discovery-fg": p.violet[700],
  "color-discovery-border": p.violet[200],
  "color-discovery-solid": p.violet[500],
  "color-teal-bg": p.teal[50],
  "color-teal-fg": p.teal[800],
  "color-teal-border": p.teal[200],
  "color-teal-solid": p.teal[500],
} satisfies Partial<ThemeTokens>;

const navyShadow = (a: number) => alpha(p.slate[900], a);

const minimal: ThemeTokens = {
  "color-canvas": p.sky[100],
  "color-canvas-image": `linear-gradient(180deg, ${p.sky[200]} 0%, ${p.sky[100]} 38%, ${p.sky[50]} 100%)`,
  "color-text-primary": p.slate[900],
  "color-text-secondary": "#4C6886",
  "color-text-tertiary": "#526D8A",
  "color-text-disabled": p.slate[400],
  "color-text-inverse": p.white,
  "color-text-link": p.blue[700],
  "color-text-on-accent": p.white,

  "color-border-subtle": alpha(p.slate[900], 0.07),
  "color-border-default": alpha(p.slate[900], 0.13),
  "color-border-strong": alpha(p.slate[900], 0.28),
  "color-border-focus": p.blue[600],

  "color-surface-solid": p.white,
  "color-surface-raised": p.white,
  "color-surface-sunken": p.slate[50],
  "color-surface-hover": alpha(p.blue[600], 0.06),
  "color-surface-pressed": alpha(p.blue[600], 0.11),
  "color-surface-selected": p.blue[50],
  "color-surface-selected-border": p.blue[300],
  "color-surface-column": alpha(p.white, 0.5),
  "color-overlay": alpha(p.slate[950], 0.32),

  "color-accent": p.blue[600],
  "color-accent-hover": p.blue[700],
  "color-accent-active": p.blue[800],
  "color-accent-soft": p.blue[50],
  "color-accent-soft-hover": p.blue[100],
  "color-accent-text": p.blue[700],
  "color-accent-gradient": `linear-gradient(180deg, #3A92FA 0%, ${p.blue[600]} 52%, #0760DA 100%)`,
  "color-accent-gradient-hover": `linear-gradient(180deg, #4C9DFB 0%, #1474F2 52%, ${p.blue[700]} 100%)`,
  "color-accent-glow": alpha(p.cyan[400], 0.45),

  ...lightTones,

  "glass-subtle-bg": alpha(p.white, 0.52),
  "glass-standard-bg": alpha(p.white, 0.7),
  "glass-raised-bg": alpha(p.white, 0.84),
  "glass-border": alpha(p.white, 0.78),
  "glass-border-outer": alpha(p.slate[900], 0.08),
  "glass-highlight": `inset 0 1px 0 ${alpha(p.white, 0.95)}`,
  "glass-sheen": `linear-gradient(180deg, ${alpha(p.white, 0.6)} 0%, ${alpha(p.white, 0.12)} 38%, ${alpha(p.sky[200], 0.18)} 100%)`,
  "glass-blur-subtle": "8px",
  "glass-blur-standard": "16px",
  "glass-blur-raised": "24px",
  "glass-saturate": "1.6",

  "shadow-xs": `0 1px 2px ${navyShadow(0.06)}`,
  "shadow-sm": `0 1px 2px ${navyShadow(0.06)}, 0 2px 6px ${navyShadow(0.05)}`,
  "shadow-md": `0 2px 4px ${navyShadow(0.05)}, 0 8px 20px ${alpha(p.blue[900], 0.08)}`,
  "shadow-lg": `0 4px 10px ${navyShadow(0.06)}, 0 18px 40px ${alpha(p.blue[900], 0.12)}`,
  "shadow-xl": `0 8px 20px ${navyShadow(0.08)}, 0 30px 70px ${alpha(p.blue[900], 0.18)}`,
  "shadow-glow": `0 0 0 1px ${alpha(p.cyan[300], 0.5)}, 0 6px 18px ${alpha(p.cyan[400], 0.28)}`,
  "focus-ring": `0 0 0 2px ${p.white}, 0 0 0 4px ${p.blue[600]}`,

  "scene-sky-top": "#BFE6FB",
  "scene-sky-bottom": "#F2FAFE",
  "scene-glow-a": alpha(p.cyan[300], 0.5),
  "scene-glow-b": alpha(p.teal[200], 0.45),
  "scene-ribbon": alpha(p.white, 0.85),
  "scene-hill-near": alpha(p.teal[300], 0.16),
  "scene-hill-far": alpha(p.cyan[300], 0.14),
  "scene-intensity": "0.8",
  "scene-aurora-a": alpha(p.teal[300], 0.35),
  "scene-aurora-b": alpha(p.cyan[200], 0.35),
  "scrollbar-thumb": alpha(p.slate[900], 0.2),
};

const dark: ThemeTokens = {
  "color-canvas": "#06142A",
  "color-canvas-image": `radial-gradient(120% 80% at 20% 0%, #0E2F55 0%, #081A33 45%, #050F21 100%)`,
  "color-text-primary": "#E7F1FB",
  "color-text-secondary": "#A3BBD3",
  "color-text-tertiary": "#8EA8C2",
  "color-text-disabled": "#5A7593",
  "color-text-inverse": p.slate[950],
  "color-text-link": p.blue[300],
  "color-text-on-accent": p.white,

  "color-border-subtle": alpha("#B7D8FF", 0.08),
  "color-border-default": alpha("#B7D8FF", 0.14),
  "color-border-strong": alpha("#B7D8FF", 0.3),
  "color-border-focus": p.cyan[400],

  "color-surface-solid": "#0D213A",
  "color-surface-raised": "#122A47",
  "color-surface-sunken": "#091A2F",
  "color-surface-hover": alpha(p.blue[300], 0.08),
  "color-surface-pressed": alpha(p.blue[300], 0.14),
  "color-surface-selected": alpha(p.blue[500], 0.2),
  "color-surface-selected-border": alpha(p.blue[400], 0.6),
  "color-surface-column": alpha("#0B1E36", 0.6),
  "color-overlay": alpha("#01060F", 0.6),

  "color-accent": "#1670E6",
  "color-accent-hover": "#0F64D6",
  "color-accent-active": "#0B57BF",
  "color-accent-soft": alpha(p.blue[500], 0.18),
  "color-accent-soft-hover": alpha(p.blue[500], 0.26),
  "color-accent-text": p.blue[300],
  "color-accent-gradient": `linear-gradient(180deg, #3B8EF5 0%, #1670E6 55%, #0F60CF 100%)`,
  "color-accent-gradient-hover": `linear-gradient(180deg, #2F84EE 0%, #0F64D6 55%, #0B57BF 100%)`,
  "color-accent-glow": alpha(p.cyan[400], 0.35),

  "color-info-bg": alpha(p.blue[500], 0.16),
  "color-info-fg": p.blue[300],
  "color-info-border": alpha(p.blue[400], 0.35),
  "color-info-solid": p.blue[400],
  "color-success-bg": alpha(p.green[500], 0.16),
  "color-success-fg": p.green[300],
  "color-success-border": alpha(p.green[400], 0.35),
  "color-success-solid": p.green[400],
  "color-warning-bg": alpha(p.amber[500], 0.16),
  "color-warning-fg": p.amber[300],
  "color-warning-border": alpha(p.amber[400], 0.35),
  "color-warning-solid": p.amber[400],
  "color-danger-bg": alpha(p.red[500], 0.16),
  "color-danger-fg": p.red[300],
  "color-danger-border": alpha(p.red[400], 0.35),
  "color-danger-solid": p.red[400],
  "color-neutral-bg": alpha(p.slate[300], 0.12),
  "color-neutral-fg": p.slate[200],
  "color-neutral-border": alpha(p.slate[300], 0.25),
  "color-neutral-solid": p.slate[400],
  "color-discovery-bg": alpha(p.violet[500], 0.18),
  "color-discovery-fg": p.violet[300],
  "color-discovery-border": alpha(p.violet[400], 0.35),
  "color-discovery-solid": p.violet[400],
  "color-teal-bg": alpha(p.teal[500], 0.16),
  "color-teal-fg": p.teal[300],
  "color-teal-border": alpha(p.teal[400], 0.35),
  "color-teal-solid": p.teal[400],

  "glass-subtle-bg": alpha("#0E2440", 0.5),
  "glass-standard-bg": alpha("#0E2440", 0.66),
  "glass-raised-bg": alpha("#112A49", 0.84),
  "glass-border": alpha("#9FCBFF", 0.14),
  "glass-border-outer": alpha("#000000", 0.35),
  "glass-highlight": `inset 0 1px 0 ${alpha("#CFE6FF", 0.12)}`,
  "glass-sheen": `linear-gradient(180deg, ${alpha("#9FD4FF", 0.08)} 0%, ${alpha("#9FD4FF", 0)} 40%)`,
  "glass-blur-subtle": "8px",
  "glass-blur-standard": "16px",
  "glass-blur-raised": "24px",
  "glass-saturate": "1.3",

  "shadow-xs": `0 1px 2px ${alpha("#000", 0.3)}`,
  "shadow-sm": `0 1px 2px ${alpha("#000", 0.3)}, 0 2px 6px ${alpha("#000", 0.2)}`,
  "shadow-md": `0 2px 4px ${alpha("#000", 0.25)}, 0 8px 20px ${alpha("#000", 0.3)}`,
  "shadow-lg": `0 4px 10px ${alpha("#000", 0.3)}, 0 18px 40px ${alpha("#000", 0.4)}`,
  "shadow-xl": `0 8px 20px ${alpha("#000", 0.35)}, 0 30px 70px ${alpha("#000", 0.5)}`,
  "shadow-glow": `0 0 0 1px ${alpha(p.cyan[400], 0.4)}, 0 6px 22px ${alpha(p.cyan[400], 0.22)}`,
  "focus-ring": `0 0 0 2px #06142A, 0 0 0 4px ${p.cyan[400]}`,

  "scene-sky-top": "#0B2A4E",
  "scene-sky-bottom": "#050F21",
  "scene-glow-a": alpha(p.blue[500], 0.28),
  "scene-glow-b": alpha(p.teal[500], 0.16),
  "scene-ribbon": alpha(p.cyan[300], 0.12),
  "scene-hill-near": alpha(p.teal[500], 0.1),
  "scene-hill-far": alpha(p.blue[500], 0.1),
  "scene-intensity": "0.7",
  "scene-aurora-a": alpha(p.green[400], 0.35),
  "scene-aurora-b": alpha(p.cyan[400], 0.3),
  "scrollbar-thumb": alpha("#B7D8FF", 0.22),
};

/**
 * Aero Scenic — a modern take on the Windows Vista palette: a deep blue-teal sky
 * lit by an aurora, dark smoky glass for the application chrome and bright,
 * calm surfaces for content. It borrows Vista's colour and mood, not its
 * mechanics: radii, controls and spacing are identical to every other theme.
 */
const scenic: ThemeTokens = {
  ...minimal,
  "color-canvas": "#D6EEFA",
  "color-text-secondary": "#3F5A78",
  "color-text-tertiary": "#405B79",
  "color-canvas-image": `linear-gradient(180deg, #A9DCF7 0%, #D3EEFB 45%, #EAF7F4 100%)`,
  "color-surface-hover": alpha("#1A8FE0", 0.08),
  "color-surface-pressed": alpha("#1A8FE0", 0.14),
  "color-surface-selected": "#DDF0FD",
  "color-surface-selected-border": "#74B9EA",
  "color-surface-column": alpha("#F4FAFE", 0.62),
  "color-accent-gradient": `linear-gradient(180deg, #44A2F6 0%, #1A78E6 55%, #0C60CC 100%)`,
  "color-accent-gradient-hover": `linear-gradient(180deg, #58AEF8 0%, #2585EC 55%, #1068D6 100%)`,
  "color-accent-glow": alpha("#3FC8FF", 0.55),
  // Content glass floats over a dark scene, so it is kept bright and dense.
  "glass-subtle-bg": alpha("#EEF7FD", 0.84),
  "glass-standard-bg": alpha("#F1F8FD", 0.86),
  "glass-raised-bg": alpha("#F5FAFE", 0.93),
  "glass-border": alpha(p.white, 0.7),
  "glass-border-outer": alpha("#04182B", 0.3),
  "glass-highlight": `inset 0 1px 0 ${alpha(p.white, 0.95)}`,
  "glass-sheen": `linear-gradient(180deg, ${alpha(p.white, 0.55)} 0%, ${alpha(p.white, 0.1)} 40%, ${alpha("#BFE6FF", 0.16)} 100%)`,
  "glass-saturate": "1.6",
  "shadow-lg": `0 4px 12px ${alpha("#04182B", 0.18)}, 0 20px 44px ${alpha("#04182B", 0.3)}`,
  "shadow-xl": `0 8px 22px ${alpha("#04182B", 0.24)}, 0 32px 72px ${alpha("#04182B", 0.4)}`,
  "scene-sky-top": "#0A2846",
  "scene-sky-bottom": "#0E4658",
  "scene-glow-a": alpha(p.cyan[400], 0.3),
  "scene-glow-b": alpha(p.green[400], 0.26),
  "scene-ribbon": alpha(p.cyan[200], 0.4),
  "scene-hill-near": alpha("#0B6B5C", 0.55),
  "scene-hill-far": alpha("#0D5A6E", 0.45),
  "scene-intensity": "1",
  "scene-aurora-a": alpha("#4FF0A6", 0.9),
  "scene-aurora-b": alpha("#6FE0FF", 0.9),
};

/** Scenic chrome: Vista-style dark smoky glass with light text (built on the Dark palette). */
const scenicChrome: Partial<ThemeTokens> = {
  ...Object.fromEntries(
    Object.entries(dark).filter(
      ([k]) => !k.startsWith("scene-") && !k.startsWith("color-canvas") && !k.startsWith("shadow-"),
    ),
  ),
  "color-text-primary": "#EEF6FC",
  "color-text-secondary": "#B6CDE0",
  "color-text-tertiary": "#A2BCD2",
  "color-surface-solid": "#12304C",
  "color-surface-raised": "#163857",
  "glass-subtle-bg": alpha("#082039", 0.62),
  "glass-standard-bg": alpha("#0A2541", 0.66),
  "glass-raised-bg": alpha("#0C2A48", 0.9),
  "glass-border": alpha("#A8DCFF", 0.18),
  "glass-border-outer": alpha("#000000", 0.28),
  "glass-highlight": `inset 0 1px 0 ${alpha("#C4E8FF", 0.18)}`,
  "glass-sheen": `linear-gradient(180deg, ${alpha("#8FD4FF", 0.14)} 0%, ${alpha("#8FD4FF", 0)} 45%)`,
  "glass-blur-subtle": "16px",
  "glass-blur-standard": "20px",
  "glass-saturate": "1.5",
};

const accessible: ThemeTokens = {
  ...minimal,
  "color-canvas": "#F4F8FB",
  "color-canvas-image": "none",
  "color-text-primary": p.slate[950],
  "color-text-secondary": p.slate[800],
  "color-text-tertiary": p.slate[700],
  "color-text-disabled": p.slate[500],
  "color-text-link": p.blue[800],
  "color-border-subtle": p.slate[300],
  "color-border-default": p.slate[500],
  "color-border-strong": p.slate[700],
  "color-border-focus": p.blue[800],
  "color-surface-sunken": "#EDF2F7",
  "color-surface-hover": p.blue[50],
  "color-surface-pressed": p.blue[100],
  "color-surface-selected": p.blue[50],
  "color-surface-selected-border": p.blue[700],
  "color-surface-column": "#EAF0F5",
  "color-accent": p.blue[700],
  "color-accent-hover": p.blue[800],
  "color-accent-active": p.blue[900],
  "color-accent-text": p.blue[800],
  "color-accent-gradient": p.blue[700],
  "color-accent-gradient-hover": p.blue[800],
  "color-accent-glow": "transparent",
  "color-info-border": p.blue[600],
  "color-success-border": p.green[600],
  "color-warning-border": p.amber[700],
  "color-danger-border": p.red[600],
  "color-neutral-border": p.slate[500],
  "color-discovery-border": p.violet[600],
  "color-teal-border": p.teal[700],
  "glass-subtle-bg": p.white,
  "glass-standard-bg": p.white,
  "glass-raised-bg": p.white,
  "glass-border": p.slate[400],
  "glass-border-outer": "transparent",
  "glass-highlight": "none",
  "glass-sheen": "none",
  "glass-blur-subtle": "0px",
  "glass-blur-standard": "0px",
  "glass-blur-raised": "0px",
  "glass-saturate": "1",
  "shadow-glow": `0 0 0 2px ${p.blue[700]}`,
  "focus-ring": `0 0 0 2px ${p.white}, 0 0 0 5px ${p.blue[800]}`,
  "scene-intensity": "0",
  "scrollbar-thumb": p.slate[500],
};

export const themes: Record<ThemeName, ThemeDefinition> = {
  minimal: {
    name: "minimal",
    label: "Aero Minimal",
    description: "Bright, understated and professional. The default.",
    colorScheme: "light",
    tokens: minimal,
  },
  scenic: {
    name: "scenic",
    label: "Aero Scenic",
    description: "Vista-inspired: aurora sky, dark glass chrome, bright content.",
    colorScheme: "light",
    tokens: scenic,
    chrome: scenicChrome,
    chromeColorScheme: "dark",
  },
  dark: {
    name: "dark",
    label: "Aero Dark",
    description: "Dark navy glass with restrained cyan highlights.",
    colorScheme: "dark",
    tokens: dark,
  },
  accessible: {
    name: "accessible",
    label: "Accessible",
    description: "High-contrast opaque surfaces with reduced effects.",
    colorScheme: "light",
    tokens: accessible,
  },
};

export const themeNames = Object.keys(themes) as ThemeName[];
