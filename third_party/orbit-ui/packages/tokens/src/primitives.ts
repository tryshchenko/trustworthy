/**
 * Primitive tokens: raw, theme-independent values. Components never use these
 * directly — they consume semantic tokens (see `themes.ts`) so that themes can
 * remap meaning without touching component code.
 */

export const palette = {
  white: "#FFFFFF",
  black: "#000000",
  /** Primary action blue. `600` is the brand primary (#086BEE). */
  blue: {
    50: "#EEF6FF",
    100: "#D9EBFF",
    200: "#B7D8FF",
    300: "#86BDFF",
    400: "#4F98FA",
    500: "#2280F5",
    600: "#086BEE",
    700: "#0656C4",
    800: "#0B489C",
    900: "#0F3E7E",
    950: "#0C2750",
  },
  /** Aqua highlights. `500` is the brand cyan (#19BCE4). */
  cyan: {
    50: "#ECFBFE",
    100: "#D0F4FC",
    200: "#A6E9F8",
    300: "#6CD8F1",
    400: "#34C6E9",
    500: "#19BCE4",
    600: "#0A93BA",
    700: "#0D7596",
    800: "#125F7A",
    900: "#144F66",
    950: "#073345",
  },
  /** Environmental teal. `500` is the brand teal (#12B8AE). */
  teal: {
    50: "#EDFCFA",
    100: "#D0F7F2",
    200: "#A3EEE5",
    300: "#6BDFD4",
    400: "#36CABF",
    500: "#12B8AE",
    600: "#0B958E",
    700: "#0E7773",
    800: "#115F5D",
    900: "#134E4D",
    950: "#042F30",
  },
  /** Sky tints used for canvas and glass tinting. */
  sky: {
    50: "#F5FBFE",
    100: "#EAF6FC",
    200: "#DDF3FF",
    300: "#C4E7FA",
    400: "#9DD5F3",
    500: "#6FBFEA",
  },
  /** Navy-tinted neutral. `900` is the brand text primary (#122D4B). */
  slate: {
    25: "#F8FBFE",
    50: "#F1F7FC",
    100: "#E4EEF6",
    200: "#D3E1EC",
    300: "#B5C8D8",
    400: "#8AA2B8",
    500: "#6A849E",
    600: "#54708D",
    700: "#3F5875",
    800: "#2A4361",
    900: "#122D4B",
    950: "#0A1B30",
    1000: "#050E1C",
  },
  green: {
    50: "#EDFBF2",
    100: "#D3F5E0",
    200: "#A9EAC4",
    300: "#72D8A1",
    400: "#3EC07C",
    500: "#1FA463",
    600: "#13874F",
    700: "#126B41",
    800: "#135536",
    900: "#11462E",
  },
  amber: {
    50: "#FFF8EB",
    100: "#FEEDC7",
    200: "#FDD98A",
    300: "#FCC14D",
    400: "#FBA924",
    500: "#F0890B",
    600: "#D36806",
    700: "#AF4A09",
    800: "#8E3A0E",
    900: "#75310F",
  },
  red: {
    50: "#FFF1F2",
    100: "#FFE0E2",
    200: "#FEC6CB",
    300: "#FD9BA4",
    400: "#F96473",
    500: "#EF3A4D",
    600: "#DB1F36",
    700: "#B8152B",
    800: "#99152A",
    900: "#82162A",
  },
  violet: {
    50: "#F4F2FF",
    100: "#EBE7FF",
    200: "#D9D2FF",
    300: "#BDAEFF",
    400: "#9D80FD",
    500: "#8152F9",
    600: "#7231EF",
    700: "#6120D6",
    800: "#511CB2",
    900: "#441A92",
  },
} as const;

export type Palette = typeof palette;
export type PaletteHue = Exclude<keyof Palette, "white" | "black">;

export const fontFamily = {
  sans: '"Inter Variable", "Inter", "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

/** Font size scale (px values expressed in rem, 16px root). */
export const fontSize = {
  "2xs": "0.6875rem", // 11
  xs: "0.75rem", // 12
  sm: "0.8125rem", // 13
  md: "0.875rem", // 14 — body
  lg: "1rem", // 16
  xl: "1.125rem", // 18
  "2xl": "1.25rem", // 20
  "3xl": "1.5rem", // 24
  "4xl": "1.75rem", // 28
  "5xl": "2rem", // 32
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeight = {
  tight: "1.2",
  snug: "1.35",
  normal: "1.5",
  relaxed: "1.65",
} as const;

export const letterSpacing = {
  tight: "-0.02em",
  snug: "-0.01em",
  normal: "0",
  wide: "0.04em",
} as const;

/** Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48 (+ 2 and 64 utilities). */
export const space = {
  "0": "0px",
  "0-5": "2px",
  "1": "4px",
  "2": "8px",
  "3": "12px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "8": "32px",
  "10": "40px",
  "12": "48px",
  "16": "64px",
} as const;

/** Radius scale: 6, 10, 14, 18, 24. */
export const radius = {
  xs: "4px",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  "2xl": "24px",
  full: "9999px",
} as const;

/** Backdrop blur levels: 0, 8, 16, 24. */
export const blur = {
  none: "0px",
  sm: "8px",
  md: "16px",
  lg: "24px",
} as const;

export const duration = {
  instant: "80ms",
  fast: "140ms", // button hover
  normal: "180ms", // card hover
  moderate: "200ms", // dropdowns
  slow: "240ms", // drawers, sidebar
} as const;

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  enter: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  exit: "cubic-bezier(0.3, 0, 0.8, 0.15)",
  linear: "linear",
} as const;

export const zIndex = {
  base: "0",
  raised: "1",
  sticky: "100",
  sidebar: "200",
  header: "300",
  inspector: "400",
  overlay: "900",
  modal: "1000",
  popover: "1100",
  toast: "1200",
  tooltip: "1300",
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;
