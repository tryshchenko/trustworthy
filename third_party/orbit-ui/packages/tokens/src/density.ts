/**
 * Density tokens control the size rhythm of interactive surfaces. Components read
 * `--orb-density-*` so switching density never requires a re-render.
 */

export const densityTokenNames = [
  "density-control-sm",
  "density-control-md",
  "density-control-lg",
  "density-padding-x",
  "density-card-padding",
  "density-card-gap",
  "density-row-height",
  "density-panel-padding",
  "density-stack-gap",
  "density-section-gap",
] as const;

export type DensityTokenName = (typeof densityTokenNames)[number];
export type DensityName = "comfortable" | "compact";

export const densities: Record<DensityName, Record<DensityTokenName, string>> = {
  comfortable: {
    "density-control-sm": "28px",
    "density-control-md": "36px",
    "density-control-lg": "44px",
    "density-padding-x": "14px",
    "density-card-padding": "14px",
    "density-card-gap": "10px",
    "density-row-height": "44px",
    "density-panel-padding": "20px",
    "density-stack-gap": "12px",
    "density-section-gap": "24px",
  },
  compact: {
    "density-control-sm": "24px",
    "density-control-md": "30px",
    "density-control-lg": "36px",
    "density-padding-x": "10px",
    "density-card-padding": "10px",
    "density-card-gap": "6px",
    "density-row-height": "34px",
    "density-panel-padding": "14px",
    "density-stack-gap": "8px",
    "density-section-gap": "16px",
  },
};
