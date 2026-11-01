import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export const glassPanelVariants = cva("orb-glass", {
  variants: {
    /**
     * Material:
     * - `subtle` — light frosting for large background regions (sidebars).
     * - `standard` — default glass for headers and floating chrome.
     * - `raised` — near-opaque glass for overlays and inspectors.
     * - `solid` — opaque surface for dense content.
     * - `selected` — opaque accent-tinted surface.
     */
    variant: {
      subtle: "orb-material-subtle",
      standard: "orb-material-standard",
      raised: "orb-material-raised",
      solid: "orb-material-solid",
      selected: "orb-material-selected",
    },
    elevation: {
      flat: "orb-elev-flat",
      low: "orb-elev-low",
      raised: "orb-elev-raised",
      floating: "orb-elev-floating",
    },
    /** Override the material's default blur (0 / 8 / 16 / 24 px). */
    blur: {
      material: "",
      none: "orb-blur-none",
      sm: "orb-blur-sm",
      md: "orb-blur-md",
      lg: "orb-blur-lg",
    },
    padding: { none: "orb-pad-none", sm: "orb-pad-sm", md: "orb-pad-md", lg: "orb-pad-lg" },
    radius: {
      none: "orb-radius-none",
      md: "orb-radius-md",
      lg: "orb-radius-lg",
      xl: "orb-radius-xl",
      "2xl": "orb-radius-2xl",
    },
    /** `luminous` adds the top-edge highlight and soft inner reflection. */
    border: {
      none: "orb-border-none",
      hairline: "orb-border-hairline",
      luminous: "orb-border-luminous",
    },
    interactive: { true: "orb-glass--interactive" },
  },
  defaultVariants: {
    variant: "standard",
    elevation: "low",
    blur: "material",
    padding: "md",
    radius: "xl",
    border: "luminous",
  },
});

export interface GlassPanelProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof glassPanelVariants> {
  /** Render as the child element (e.g. `<aside>`, `<header>`). */
  asChild?: boolean;
}

/**
 * Reusable frosted-glass surface. Falls back to an opaque surface when
 * `backdrop-filter` is unsupported or the user prefers reduced transparency.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { className, variant, elevation, blur, padding, radius, border, interactive, asChild, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      ref={ref}
      className={cn(
        glassPanelVariants({ variant, elevation, blur, padding, radius, border, interactive }),
        className,
      )}
      {...props}
    />
  );
});
