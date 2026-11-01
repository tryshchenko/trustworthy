import {
  IssueBugIcon,
  IssueEpicIcon,
  IssueStoryIcon,
  IssueSubtaskIcon,
  IssueTaskIcon,
} from "@orbit/icons";
import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { issueTypeLabels, priorityLabels, type IssuePriority, type IssueType } from "./types";

/* ========================================================== IssueTypeIcon */

const typeGlyphs = {
  story: IssueStoryIcon,
  bug: IssueBugIcon,
  task: IssueTaskIcon,
  epic: IssueEpicIcon,
  subtask: IssueSubtaskIcon,
} as const;

export interface IssueTypeIconProps {
  type: IssueType;
  size?: number;
  /** Render the type name next to the icon. */
  showLabel?: boolean;
  className?: string;
}

/** Issue type glyph with an accessible name (shape + colour + text). */
export function IssueTypeIcon({ type, size = 16, showLabel, className }: IssueTypeIconProps) {
  const Glyph = typeGlyphs[type];
  const label = issueTypeLabels[type];
  return (
    <span className={cn("orb-issue-type", className)}>
      <Glyph size={size} title={showLabel ? undefined : label} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}

/* ====================================================== PriorityIndicator */

export interface PriorityIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  priority: IssuePriority;
  showLabel?: boolean;
  size?: number;
}

const priorityPaths: Record<IssuePriority, string> = {
  highest: "M3 9.5 8 5l5 4.5M3 13 8 8.5l5 4.5",
  high: "M3 11 8 6.5l5 4.5",
  medium: "M3 6.5h10M3 10.5h10",
  low: "M3 6.5 8 11l5-4.5",
  lowest: "M3 3.5 8 8l5-4.5M3 7.5 8 12l5-4.5",
};

/** Priority as a directional glyph (shape encodes level) with an accessible label. */
export function PriorityIndicator({
  priority,
  showLabel,
  size = 16,
  className,
  ...props
}: PriorityIndicatorProps) {
  const label = priorityLabels[priority];
  return (
    <span
      className={cn("orb-priority", `orb-priority--${priority}`, className)}
      role={showLabel ? undefined : "img"}
      aria-label={showLabel ? undefined : `Priority: ${label}`}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={priorityPaths[priority]} />
      </svg>
      {showLabel && <span className="orb-priority__label">{label}</span>}
    </span>
  );
}
