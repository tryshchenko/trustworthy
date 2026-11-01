import { IssueCard, type KanbanDragHandleProps } from "@orbit/ui";
import { memo, useMemo } from "react";
import { labels, people, type Issue, type StatusId } from "../data/mock";
import { useIsSelected } from "../state/selection";
import { MoveMenu } from "./MoveMenu";

const peopleById = new Map(people.map((p) => [p.id, p]));
const labelsById = new Map(labels.map((l) => [l.value, l]));
const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  issue: Issue;
  dragHandleProps: KanbanDragHandleProps;
  isOverlay: boolean;
  onOpen: (key: string) => void;
  onMove: (issue: Issue, status: StatusId, position: "top" | "bottom") => void;
}

/** Maps the app's Issue model onto the library's presentational IssueCard. */
export const BoardCard = memo(function BoardCard({
  issue,
  dragHandleProps,
  isOverlay,
  onOpen,
  onMove,
}: Props) {
  const selected = useIsSelected(issue.key);
  const cardLabels = useMemo(
    () => issue.labels.map((l) => labelsById.get(l)!).filter(Boolean),
    [issue.labels],
  );
  const done = issue.subtasks.filter((s) => s.done).length;
  const open = issue.status !== "done";
  return (
    <IssueCard
      {...dragHandleProps}
      issueKey={issue.key}
      title={issue.title}
      type={issue.type}
      priority={issue.priority}
      assignee={peopleById.get(issue.assigneeId ?? "")}
      labels={cardLabels}
      estimate={issue.estimate ?? undefined}
      dueDate={open ? (issue.dueDate ?? undefined) : undefined}
      overdue={Boolean(open && issue.dueDate && issue.dueDate < today())}
      selected={selected}
      dragging={isOverlay}
      onOpen={() => onOpen(issue.key)}
      actions={!isOverlay && <MoveMenu issue={issue} onMove={(s, p) => onMove(issue, s, p)} />}
      footer={
        issue.subtasks.length > 0 ? (
          <span className="text-[11px] font-semibold text-fg-muted">
            {done}/{issue.subtasks.length} subtasks
          </span>
        ) : undefined
      }
    />
  );
});
