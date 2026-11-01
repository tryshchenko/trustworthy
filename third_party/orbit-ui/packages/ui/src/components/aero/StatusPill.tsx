import type { Tone } from "@orbit/tokens";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";

/** Glyph shapes that encode progress without relying on colour. */
export type StatusShape = "todo" | "progress" | "review" | "done" | "blocked" | "dot";

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Shape of the leading glyph. Provide a different shape per status category. */
  shape?: StatusShape;
  /** Replace the glyph with a custom icon. */
  icon?: ReactNode;
  size?: "sm" | "md";
  /** `soft` (filled) or `outline`. */
  appearance?: "soft" | "outline";
}

export function StatusGlyph({ shape = "dot", size = 12 }: { shape?: StatusShape; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 12 12",
    "aria-hidden": true as const,
    className: "orb-status-glyph",
  };
  switch (shape) {
    case "todo":
      return (
        <svg {...common}>
          <circle
            cx="6"
            cy="6"
            r="4.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2.2 1.6"
          />
        </svg>
      );
    case "progress":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.4 A4.6 4.6 0 0 1 6 10.6 Z" fill="currentColor" />
        </svg>
      );
    case "review":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.4 A4.6 4.6 0 1 1 1.4 6 L6 6 Z" fill="currentColor" />
        </svg>
      );
    case "done":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5.2" fill="currentColor" />
          <path
            d="M3.6 6.1 5.3 7.8 8.5 4.4"
            fill="none"
            stroke="var(--orb-color-surface-solid)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "blocked":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 9 9 3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="3.2" fill="currentColor" />
        </svg>
      );
  }
}

/**
 * Semantic status label: text + shape glyph + tone. Status is always readable
 * from the text and shape, so colour is reinforcement only.
 */
export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(function StatusPill(
  {
    tone = "neutral",
    shape = "dot",
    icon,
    size = "md",
    appearance = "soft",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "orb-status",
        `orb-tone-${tone}`,
        `orb-status--${size}`,
        `orb-status--${appearance}`,
        className,
      )}
      {...props}
    >
      <span className="orb-status__glyph">{icon ?? <StatusGlyph shape={shape} />}</span>
      <span className="orb-status__label">{children}</span>
    </span>
  );
});
