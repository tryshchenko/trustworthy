import { forwardRef, useId, type HTMLAttributes } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";

export interface AeroBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * - `auto` — scenery follows the theme (full in Scenic, soft in Minimal/Dark, none in Accessible).
   * - `none` — flat canvas gradient only.
   * - `soft` — light glows and ribbons.
   * - `full` — glows, ribbons and rolling landscape.
   */
  scenery?: "auto" | "none" | "soft" | "full";
  /** Optional photograph rendered beneath the tint (should be optimised, e.g. AVIF/WebP ≤ 200 kB). */
  imageSrc?: string;
  /** `fixed` covers the viewport; `absolute` fills the nearest positioned ancestor. */
  position?: "fixed" | "absolute";
}

/**
 * Theme-aware atmospheric layer. Pure CSS + one inline SVG — no network requests,
 * no animation, rendered once behind the app (never per-card).
 */
export const AeroBackground = forwardRef<HTMLDivElement, AeroBackgroundProps>(
  function AeroBackground(
    { scenery = "auto", imageSrc, position = "fixed", className, style, ...props },
    ref,
  ) {
    const { theme } = useTheme();
    const uid = useId().replace(/:/g, "");
    const ribbonId = `orb-ribbon-${uid}`;
    const auroraId = `orb-aurora-${uid}`;
    const level =
      scenery === "auto"
        ? theme === "scenic"
          ? "full"
          : theme === "accessible"
            ? "none"
            : "soft"
        : scenery;
    return (
      <div
        ref={ref}
        aria-hidden
        className={cn("orb-bg", `orb-bg--${position}`, `orb-bg--${level}`, className)}
        style={style}
        {...props}
      >
        {imageSrc && level !== "none" && (
          <img
            className="orb-bg__image"
            src={imageSrc}
            alt=""
            decoding="async"
            loading="lazy"
            fetchPriority="low"
          />
        )}
        {level !== "none" && (
          <>
            <div className="orb-bg__glow orb-bg__glow--a" />
            <div className="orb-bg__glow orb-bg__glow--b" />
            <svg
              className="orb-bg__art"
              viewBox="0 0 1440 900"
              preserveAspectRatio="xMidYMax slice"
            >
              <defs>
                <linearGradient id={ribbonId} x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0"
                    style={{ stopColor: "var(--orb-scene-ribbon)", stopOpacity: 0 }}
                  />
                  <stop offset="0.45" style={{ stopColor: "var(--orb-scene-ribbon)" }} />
                  <stop
                    offset="1"
                    style={{ stopColor: "var(--orb-scene-ribbon)", stopOpacity: 0 }}
                  />
                </linearGradient>
                <linearGradient id={auroraId} x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0"
                    style={{ stopColor: "var(--orb-scene-aurora-a)", stopOpacity: 0 }}
                  />
                  <stop offset="0.3" style={{ stopColor: "var(--orb-scene-aurora-a)" }} />
                  <stop offset="0.7" style={{ stopColor: "var(--orb-scene-aurora-b)" }} />
                  <stop
                    offset="1"
                    style={{ stopColor: "var(--orb-scene-aurora-b)", stopOpacity: 0 }}
                  />
                </linearGradient>
              </defs>
              {level === "full" && (
                // Aurora sweep (à la the Vista wallpaper). Soft edges come from stacked
                // strokes of decreasing width — no SVG filters, so it stays cheap to paint.
                <g
                  className="orb-bg__aurora"
                  fill="none"
                  stroke={`url(#${auroraId})`}
                  strokeLinecap="round"
                >
                  {[
                    "M-160 760 C 180 560, 520 640, 820 420 S 1260 70, 1640 110",
                    "M-160 860 C 260 700, 640 760, 960 560 S 1380 250, 1640 280",
                  ].map((d, i) => (
                    <g key={d} opacity={i === 0 ? 1 : 0.65}>
                      {[
                        [260, 0.06],
                        [190, 0.08],
                        [130, 0.11],
                        [84, 0.16],
                        [46, 0.24],
                        [20, 0.4],
                      ].map(([w, o]) => (
                        <path key={w} d={d} strokeWidth={w} opacity={o} />
                      ))}
                      <path d={d} strokeWidth={4} stroke="rgba(255,255,255,0.75)" />
                    </g>
                  ))}
                </g>
              )}
              <g
                className="orb-bg__ribbons"
                fill="none"
                stroke={`url(#${ribbonId})`}
                strokeLinecap="round"
              >
                <path
                  d="M-80 520 C 260 380, 520 640, 860 470 S 1360 330, 1540 420"
                  strokeWidth="2.2"
                />
                <path
                  d="M-80 560 C 300 430, 560 690, 900 520 S 1380 390, 1540 470"
                  strokeWidth="1.2"
                  opacity="0.7"
                />
                <path
                  d="M-80 600 C 340 500, 620 720, 940 580 S 1400 460, 1540 530"
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              </g>
              {level === "full" && (
                <g className="orb-bg__hills">
                  <path
                    d="M0 760 C 240 690, 420 700, 640 742 S 1080 690, 1440 720 L1440 900 L0 900Z"
                    style={{ fill: "var(--orb-scene-hill-far)" }}
                  />
                  <path
                    d="M0 820 C 280 760, 560 790, 820 812 S 1240 770, 1440 800 L1440 900 L0 900Z"
                    style={{ fill: "var(--orb-scene-hill-near)" }}
                  />
                </g>
              )}
            </svg>
            {level === "full" && (
              <div className="orb-bg__bubbles">
                <span style={{ left: "8%", top: "18%", width: 120, height: 120 }} />
                <span style={{ left: "78%", top: "12%", width: 70, height: 70 }} />
                <span style={{ left: "64%", top: "58%", width: 180, height: 180 }} />
                <span style={{ left: "22%", top: "70%", width: 54, height: 54 }} />
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);
