import { CalendarClock } from "@orbit/icons";
import {
  forwardRef,
  memo,
  useId,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { StatusPill } from "../aero/StatusPill";
import { Avatar, Tag } from "../foundation/Display";
import { IssueTypeIcon, PriorityIndicator } from "./Indicators";
import {
  issueTypeLabels,
  priorityLabels,
  type IssuePriority,
  type IssueType,
  type LabelDefinition,
  type Person,
  type StatusDefinition,
} from "./types";

export interface IssueCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "title"> {
  /** Issue key, e.g. "PLAT-87". */
  issueKey: string;
  title: string;
  type?: IssueType;
  priority?: IssuePriority;
  assignee?: Pick<Person, "name" | "avatarUrl"> | null;
  labels?: (string | LabelDefinition)[];
  /** Show a status pill on the card (off by default — board columns already convey status). */
  status?: StatusDefinition;
  /** Story points / estimate. */
  estimate?: number;
  /** ISO date. Shown with a warning tone when `overdue`. */
  dueDate?: string;
  overdue?: boolean;
  selected?: boolean;
  /** Visual state while being dragged. */
  dragging?: boolean;
  /** Called on click or Enter. Makes the card an interactive button-like surface. */
  onOpen?: () => void;
  /** Extra controls rendered over the card's top-right corner (e.g. a "Move to…" menu). */
  actions?: ReactNode;
  /** Slot rendered at the bottom (e.g. subtask progress). */
  footer?: ReactNode;
  density?: "default" | "compact";
}

function formatDue(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

/**
 * Compact issue summary for boards and lists. Opaque surface (no blur) so it
 * stays cheap to render hundreds of times. Spread drag-handle props from
 * `KanbanBoard` onto it — handlers are merged, not replaced.
 */
export const IssueCard = memo(
  forwardRef<HTMLDivElement, IssueCardProps>(function IssueCard(
    {
      issueKey,
      title,
      type,
      priority,
      assignee,
      labels,
      status,
      estimate,
      dueDate,
      overdue,
      selected,
      dragging,
      onOpen,
      actions,
      footer,
      density = "default",
      className,
      onClick,
      onKeyDown,
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) {
    const metaId = useId();
    const labelDefs = (labels ?? []).map((l) =>
      typeof l === "string" ? { value: l, label: l } : l,
    );
    const summary = [
      type && issueTypeLabels[type],
      priority && `${priorityLabels[priority]} priority`,
      status && `Status ${status.label}`,
      assignee ? `Assigned to ${assignee.name}` : "Unassigned",
      labelDefs.length ? `Labels: ${labelDefs.map((l) => l.label).join(", ")}` : undefined,
      estimate != null ? `${estimate} points` : undefined,
      dueDate ? `Due ${formatDue(dueDate)}${overdue ? ", overdue" : ""}` : undefined,
    ]
      .filter(Boolean)
      .join(". ");

    const interactive = Boolean(onOpen) || props.role === "button";
    return (
      <div
        className={cn(
          "orb-issue-card",
          density === "compact" && "orb-issue-card--compact",
          selected && "orb-issue-card--selected",
          dragging && "orb-issue-card--dragging",
          className,
        )}
      >
        <div
          ref={ref}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={`${issueKey}: ${title}`}
          aria-describedby={[describedBy, metaId].filter(Boolean).join(" ")}
          aria-pressed={undefined}
          aria-current={selected ? "true" : undefined}
          className="orb-issue-card__surface"
          onClick={(e: MouseEvent<HTMLDivElement>) => {
            onClick?.(e);
            if (!e.defaultPrevented) onOpen?.();
          }}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            onKeyDown?.(e);
            if (!e.defaultPrevented && e.key === "Enter" && e.target === e.currentTarget) {
              e.preventDefault();
              onOpen?.();
            }
          }}
          {...props}
        >
          <p className="orb-issue-card__title">{title}</p>
          {labelDefs.length > 0 && (
            <div className="orb-issue-card__labels">
              {labelDefs.slice(0, 3).map((l) => (
                <Tag key={l.value} size="sm" color={l.color ?? "neutral"}>
                  {l.label}
                </Tag>
              ))}
              {labelDefs.length > 3 && (
                <span className="orb-issue-card__more">+{labelDefs.length - 3}</span>
              )}
            </div>
          )}
          {status && (
            <StatusPill size="sm" tone={status.tone} shape={status.shape}>
              {status.label}
            </StatusPill>
          )}
          <div className="orb-issue-card__meta">
            <span className="orb-issue-card__key">
              {type && <IssueTypeIcon type={type} size={15} />}
              <span>{issueKey}</span>
            </span>
            <span className="orb-issue-card__meta-end">
              {dueDate && (
                <span
                  className={cn("orb-issue-card__due", overdue && "orb-issue-card__due--overdue")}
                >
                  <CalendarClock size={13} aria-hidden />
                  {formatDue(dueDate)}
                </span>
              )}
              {estimate != null && <span className="orb-issue-card__estimate">{estimate}</span>}
              {priority && <PriorityIndicator priority={priority} size={15} />}
              {assignee ? (
                <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />
              ) : (
                <span
                  className="orb-avatar orb-avatar--xs orb-avatar--empty"
                  role="img"
                  aria-label="Unassigned"
                />
              )}
            </span>
          </div>
          {footer}
          <span id={metaId} className="orb-sr-only">
            {summary}
          </span>
        </div>
        {actions && <div className="orb-issue-card__actions">{actions}</div>}
      </div>
    );
  }),
);
IssueCard.displayName = "IssueCard";
