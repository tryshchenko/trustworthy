import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { StatusPill } from "../aero/StatusPill";
import { Avatar, Tag } from "../foundation/Display";
import { IssueTypeIcon, PriorityIndicator } from "./Indicators";
import {
  defaultStatuses,
  findStatus,
  type IssuePriority,
  type IssueType,
  type LabelDefinition,
  type Person,
  type StatusDefinition,
} from "./types";

export interface BacklogItem {
  id: string;
  issueKey: string;
  title: string;
  type: IssueType;
  status: string;
  priority: IssuePriority;
  assignee?: Pick<Person, "name" | "avatarUrl"> | null;
  labels?: LabelDefinition[];
  estimate?: number | null;
}

export interface BacklogListProps {
  items: BacklogItem[];
  statuses?: StatusDefinition[];
  /** Accessible name of the list. */
  label: string;
  onOpen?: (item: BacklogItem) => void;
  selectedId?: string | null;
  /** Viewport height. The list virtualises rows so thousands of items stay smooth. */
  height?: number | string;
  rowHeight?: number;
  empty?: ReactNode;
  className?: string;
  /** Trailing per-row slot, e.g. a quick-actions menu. */
  renderActions?: (item: BacklogItem) => ReactNode;
}

const Row = memo(function Row({
  item,
  status,
  selected,
  onOpen,
  actions,
  index,
  total,
  style,
}: {
  item: BacklogItem;
  status?: StatusDefinition;
  selected: boolean;
  onOpen?: (item: BacklogItem) => void;
  actions?: ReactNode;
  index: number;
  total: number;
  style: CSSProperties;
}) {
  return (
    <div
      role="listitem"
      aria-setsize={total}
      aria-posinset={index + 1}
      style={style}
      className={cn("orb-backlog__row", selected && "orb-backlog__row--selected")}
    >
      <button
        type="button"
        className="orb-backlog__open"
        onClick={() => onOpen?.(item)}
        aria-current={selected ? "true" : undefined}
        data-backlog-row
      >
        <IssueTypeIcon type={item.type} />
        <span className="orb-backlog__key">{item.issueKey}</span>
        <span className="orb-backlog__title">{item.title}</span>
      </button>
      <span className="orb-backlog__labels">
        {item.labels?.slice(0, 2).map((l) => (
          <Tag key={l.value} size="sm" color={l.color ?? "neutral"}>
            {l.label}
          </Tag>
        ))}
      </span>
      {status && (
        <StatusPill
          size="sm"
          tone={status.tone}
          shape={status.shape}
          className="orb-backlog__status"
        >
          {status.label}
        </StatusPill>
      )}
      <PriorityIndicator priority={item.priority} />
      <span
        className="orb-backlog__estimate"
        aria-label={item.estimate != null ? `${item.estimate} points` : "Not estimated"}
      >
        {item.estimate ?? "–"}
      </span>
      {item.assignee ? (
        <Avatar name={item.assignee.name} src={item.assignee.avatarUrl} size="xs" />
      ) : (
        <span
          className="orb-avatar orb-avatar--xs orb-avatar--empty"
          role="img"
          aria-label="Unassigned"
        />
      )}
      {actions}
    </div>
  );
});

/** Dense, virtualised issue list for backlogs and search results. */
export function BacklogList({
  items,
  statuses = defaultStatuses,
  label,
  onOpen,
  selectedId,
  height = 560,
  rowHeight = 44,
  empty = "No issues",
  className,
  renderActions,
}: BacklogListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  // Arrow keys move between row buttons; virtualiser scrolls the target into view first.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const current = (e.target as HTMLElement).closest<HTMLElement>("[aria-posinset]");
    if (!current) return;
    e.preventDefault();
    const nextIndex =
      Number(current.getAttribute("aria-posinset")) - 1 + (e.key === "ArrowDown" ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= items.length) return;
    virtualizer.scrollToIndex(nextIndex, { align: "auto" });
    requestAnimationFrame(() =>
      scrollRef.current
        ?.querySelector<HTMLElement>(`[aria-posinset="${nextIndex + 1}"] [data-backlog-row]`)
        ?.focus(),
    );
  };

  if (!items.length)
    return <div className={cn("orb-backlog orb-backlog--empty", className)}>{empty}</div>;

  return (
    // Arrow-key handling is delegated from the row buttons inside this scroller.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={scrollRef}
      className={cn("orb-backlog", className)}
      style={{ height }}
      onKeyDown={onKeyDown}
    >
      <div
        role="list"
        aria-label={label}
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const item = items[v.index]!;
          return (
            <Row
              key={item.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: v.size,
                transform: `translateY(${v.start}px)`,
              }}
              item={item}
              index={v.index}
              total={items.length}
              status={findStatus(statuses, item.status)}
              selected={selectedId === item.id}
              onOpen={onOpen}
              actions={renderActions?.(item)}
            />
          );
        })}
      </div>
    </div>
  );
}
