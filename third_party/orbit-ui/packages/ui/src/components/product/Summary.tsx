import { CalendarRange, Target } from "@orbit/icons";
import type { Tone } from "@orbit/tokens";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";

/* ========================================================= ProgressSummary */

export interface ProgressSegment {
  label: string;
  value: number;
  tone: Tone;
}

export interface ProgressSummaryProps extends HTMLAttributes<HTMLDivElement> {
  segments: ProgressSegment[];
  /** Label for the whole bar, e.g. "Sprint progress". */
  label: string;
  /** Unit appended to values in the legend (e.g. "issues", "pts"). */
  unit?: string;
  showLegend?: boolean;
}

/** Segmented progress bar with an accessible text equivalent. */
export const ProgressSummary = forwardRef<HTMLDivElement, ProgressSummaryProps>(
  function ProgressSummary(
    { segments, label, unit = "", showLegend = true, className, ...props },
    ref,
  ) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const text = segments.map((s) => `${s.label}: ${s.value}${unit ? ` ${unit}` : ""}`).join(", ");
    return (
      <div ref={ref} className={cn("orb-progress-summary", className)} {...props}>
        <div
          className="orb-progress-summary__bar"
          role="img"
          aria-label={`${label}. ${text}. Total ${total}.`}
        >
          {segments.map((s) =>
            s.value > 0 ? (
              <span
                key={s.label}
                className={cn("orb-progress-summary__segment", `orb-tone-${s.tone}`)}
                style={{ flexGrow: s.value }}
              />
            ) : null,
          )}
          {total === 0 && (
            <span className="orb-progress-summary__segment orb-progress-summary__segment--empty" />
          )}
        </div>
        {showLegend && (
          <ul className="orb-progress-summary__legend" aria-hidden>
            {segments.map((s) => (
              <li key={s.label}>
                <span className={cn("orb-progress-summary__swatch", `orb-tone-${s.tone}`)} />
                {s.label}
                <strong>
                  {s.value}
                  {unit && ` ${unit}`}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

/* ============================================================ SprintHeader */

export interface SprintHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  name: string;
  /** ISO dates. */
  startDate?: string;
  endDate?: string;
  goal?: ReactNode;
  segments?: ProgressSegment[];
  /** e.g. "4 days left". Computed from endDate if omitted. */
  remaining?: string;
  actions?: ReactNode;
}

function fmt(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

export const SprintHeader = forwardRef<HTMLDivElement, SprintHeaderProps>(function SprintHeader(
  { name, startDate, endDate, goal, segments, remaining, actions, className, ...props },
  ref,
) {
  let left = remaining;
  if (!left && endDate) {
    const [y = 1970, m = 1, d = 1] = endDate.split("-").map(Number);
    const days = Math.ceil((new Date(y, m - 1, d).getTime() - Date.now()) / 86400000);
    left =
      days > 0 ? `${days} day${days === 1 ? "" : "s"} left` : days === 0 ? "Ends today" : "Ended";
  }
  return (
    <div ref={ref} className={cn("orb-sprint", className)} {...props}>
      <div className="orb-sprint__main">
        <div className="orb-sprint__title-row">
          <h2 className="orb-sprint__name">{name}</h2>
          {startDate && endDate && (
            <span className="orb-sprint__dates">
              <CalendarRange size={14} aria-hidden />
              {fmt(startDate)} – {fmt(endDate)}
            </span>
          )}
          {left && <span className="orb-sprint__remaining">{left}</span>}
        </div>
        {goal && (
          <p className="orb-sprint__goal">
            <Target size={14} aria-hidden />
            <span>
              <span className="orb-sr-only">Sprint goal: </span>
              {goal}
            </span>
          </p>
        )}
      </div>
      {segments && (
        <ProgressSummary
          className="orb-sprint__progress"
          segments={segments}
          label={`${name} progress`}
          unit=""
        />
      )}
      {actions && <div className="orb-sprint__actions">{actions}</div>}
    </div>
  );
});
