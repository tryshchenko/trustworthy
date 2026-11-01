import { forwardRef, useId, type ReactNode, type SVGProps } from "react";

export interface OrbitIconProps extends SVGProps<SVGSVGElement> {
  /** Pixel size of the square icon. Defaults to 16. */
  size?: number | string;
  /** Accessible name. When omitted the icon is decorative (`aria-hidden`). */
  title?: string;
}

function a11y(title: string | undefined) {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };
}

/** The Orbit mark: a luminous sphere crossed by an orbital ring. */
export const OrbitLogo = forwardRef<SVGSVGElement, OrbitIconProps>(function OrbitLogo(
  { size = 28, title, ...props },
  ref,
) {
  const id = `orbit-logo${useId().replace(/:/g, "")}`;
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      {...a11y(title)}
      {...props}
    >
      <defs>
        <radialGradient id={`${id}-sphere`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#E4FAFF" />
          <stop offset="0.35" stopColor="#5FD3F0" />
          <stop offset="0.75" stopColor="#1784EE" />
          <stop offset="1" stopColor="#0B4FB3" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FE6D9" />
          <stop offset="1" stopColor="#12B8AE" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="10" fill={`url(#${id}-sphere)`} />
      <ellipse
        cx="13.2"
        cy="11.6"
        rx="5"
        ry="2.8"
        fill="#fff"
        opacity="0.55"
        transform="rotate(-24 13.2 11.6)"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="14.5"
        ry="5.2"
        stroke={`url(#${id}-ring)`}
        strokeWidth="2"
        transform="rotate(-22 16 16)"
      />
    </svg>
  );
});

type GlyphProps = OrbitIconProps & { color?: string };

function makeIssueGlyph(name: string, fill: string, path: ReactNode) {
  const C = forwardRef<SVGSVGElement, GlyphProps>(function IssueGlyph(
    { size = 16, title, color = fill, ...props },
    ref,
  ) {
    return (
      <svg ref={ref} width={size} height={size} viewBox="0 0 16 16" {...a11y(title)} {...props}>
        <rect x="0.5" y="0.5" width="15" height="15" rx="4" fill={color} />
        <rect x="0.5" y="0.5" width="15" height="7.5" rx="4" fill="#fff" opacity="0.16" />
        <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {path}
        </g>
      </svg>
    );
  });
  C.displayName = name;
  return C;
}

/** Story: bookmark glyph on green. */
export const IssueStoryIcon = makeIssueGlyph(
  "IssueStoryIcon",
  "#1FA463",
  <path d="M5.5 4.5h5v7L8 9.6l-2.5 1.9z" fill="#fff" stroke="none" />,
);
/** Bug: dot on red. */
export const IssueBugIcon = makeIssueGlyph(
  "IssueBugIcon",
  "#DB1F36",
  <circle cx="8" cy="8" r="2.6" fill="#fff" stroke="none" />,
);
/** Task: check on blue. */
export const IssueTaskIcon = makeIssueGlyph(
  "IssueTaskIcon",
  "#2280F5",
  <path d="M5 8.2l2 2 4-4.4" />,
);
/** Epic: lightning on violet. */
export const IssueEpicIcon = makeIssueGlyph(
  "IssueEpicIcon",
  "#7231EF",
  <path d="M8.8 3.8 5.6 8.6h2.6l-1 3.6 3.2-4.8H7.8z" fill="#fff" stroke="none" />,
);
/** Subtask: linked squares on cyan. */
export const IssueSubtaskIcon = makeIssueGlyph(
  "IssueSubtaskIcon",
  "#0A93BA",
  <>
    <rect x="4.2" y="4.2" width="4.2" height="4.2" rx="1" />
    <rect x="7.6" y="7.6" width="4.2" height="4.2" rx="1" fill="#fff" />
  </>,
);
