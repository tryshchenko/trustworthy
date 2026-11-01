import { AlertTriangle, CheckCircle2, Clock3, ListTodo } from "@orbit/icons";
import {
  ActivityFeed,
  Avatar,
  DataGrid,
  Panel,
  Progress,
  ProgressSummary,
  StatusPill,
  type DataGridColumn,
} from "@orbit/ui";
import { useMemo, type ReactNode } from "react";
import { people, statuses } from "../data/mock";
import { useIssues } from "../state/store";

interface WorkloadRow {
  id: string;
  name: string;
  role: string;
  open: number;
  inProgress: number;
  done: number;
  points: number;
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="orb-card orb-card--solid flex items-center gap-3 p-4">
      <span
        className={`orb-tone-${tone} grid size-10 place-items-center rounded-full`}
        style={{ background: "var(--orb-tone-bg)", color: "var(--orb-tone-solid)" }}
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs font-medium text-fg-muted">{label}</div>
      </div>
    </div>
  );
}

export function OverviewView({ onOpenIssue }: { onOpenIssue: (key: string) => void }) {
  const { issues, personById } = useIssues();
  const today = new Date().toISOString().slice(0, 10);
  const count = (s: string) => issues.filter((i) => i.status === s).length;
  const overdue = issues.filter(
    (i) => i.dueDate && i.dueDate < today && i.status !== "done",
  ).length;
  const doneCount = count("done");

  const rows = useMemo<WorkloadRow[]>(
    () =>
      people.map((p) => {
        const mine = issues.filter((i) => i.assigneeId === p.id);
        return {
          id: p.id,
          name: p.name,
          role: p.detail ?? "",
          open: mine.filter((i) => i.status === "todo").length,
          inProgress: mine.filter((i) => i.status === "in-progress" || i.status === "in-review")
            .length,
          done: mine.filter((i) => i.status === "done").length,
          points: mine.reduce((n, i) => n + (i.status !== "done" ? (i.estimate ?? 0) : 0), 0),
        };
      }),
    [issues],
  );

  const columns: DataGridColumn<WorkloadRow>[] = [
    {
      id: "name",
      header: "Member",
      isRowHeader: true,
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="orb-inline">
          <Avatar name={r.name} size="xs" decorative />
          <span className="truncate">{r.name}</span>
        </span>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (r) => <span className="text-fg-muted">{r.role}</span>,
      sortValue: (r) => r.role,
    },
    {
      id: "open",
      header: "To do",
      align: "end",
      width: 80,
      cell: (r) => r.open,
      sortValue: (r) => r.open,
    },
    {
      id: "wip",
      header: "Active",
      align: "end",
      width: 80,
      cell: (r) => r.inProgress,
      sortValue: (r) => r.inProgress,
    },
    {
      id: "done",
      header: "Done",
      align: "end",
      width: 80,
      cell: (r) => r.done,
      sortValue: (r) => r.done,
    },
    {
      id: "load",
      header: "Open points",
      width: 180,
      sortValue: (r) => r.points,
      cell: (r) => (
        <Progress
          value={r.points}
          max={20}
          size="sm"
          showValue={false}
          label={`${r.name}: ${r.points} open points`}
          tone={r.points > 14 ? "warning" : "accent"}
        />
      ),
    },
  ];

  const recent = useMemo(
    () =>
      issues
        .flatMap((i) => i.activity.map((a) => ({ ...a, issue: i })))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8),
    [issues],
  );

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<ListTodo size={18} />}
          label="Open issues"
          value={issues.length - doneCount}
          tone="info"
        />
        <Stat
          icon={<Clock3 size={18} />}
          label="In progress"
          value={count("in-progress") + count("in-review")}
          tone="discovery"
        />
        <Stat
          icon={<CheckCircle2 size={18} />}
          label="Completed"
          value={doneCount}
          tone="success"
        />
        <Stat icon={<AlertTriangle size={18} />} label="Overdue" value={overdue} tone="warning" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Team workload" description="Sortable — click a column header.">
          <DataGrid
            label="Team workload"
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            defaultSort={{ columnId: "load", direction: "desc" }}
            height={420}
          />
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Status breakdown">
            <ProgressSummary
              label="Issues by status"
              unit=""
              segments={statuses.map((s) => ({
                label: s.label,
                value: count(s.value),
                tone: s.tone,
              }))}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {statuses.map((s) => (
                <StatusPill key={s.value} tone={s.tone} shape={s.shape}>
                  {s.label} · {count(s.value)}
                </StatusPill>
              ))}
            </div>
          </Panel>
          <Panel title="Recent activity">
            <ActivityFeed
              items={recent.map((a) => ({
                id: a.id,
                actor: personById(a.actorId) ?? { name: "Someone" },
                action: (
                  <>
                    {a.text} on{" "}
                    <a
                      href={`#/board/${a.issue.key}`}
                      className="font-medium whitespace-nowrap text-accent-fg hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenIssue(a.issue.key);
                      }}
                    >
                      {a.issue.key}
                    </a>
                  </>
                ),
                timestamp: a.at,
              }))}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
