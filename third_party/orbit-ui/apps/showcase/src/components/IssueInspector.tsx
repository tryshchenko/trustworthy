import { Copy, Link2, MoreHorizontal, Plus, Trash2 } from "@orbit/icons";
import {
  ActivityFeed,
  AssigneeSelector,
  Avatar,
  Button,
  Checkbox,
  Combobox,
  CommentThread,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EditableText,
  FloatingInspector,
  IconButton,
  Input,
  IssueDetailPanel,
  IssueDetailSection,
  IssueTypeIcon,
  PrioritySelector,
  Progress,
  Select,
  StatusSelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  toast,
  priorityLabels,
} from "@orbit/ui";
import { useState, type FormEvent } from "react";
import {
  CURRENT_USER_ID,
  labels,
  people,
  sprint,
  statuses,
  type Issue,
  type StatusId,
} from "../data/mock";
import { useIssues } from "../state/store";

interface Props {
  issue: Issue | undefined;
  onClose: () => void;
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));

export function IssueInspector({ issue, onClose }: Props) {
  return (
    <FloatingInspector
      open={Boolean(issue)}
      onOpenChange={(o) => !o && onClose()}
      width={460}
      title={
        issue && (
          <span className="orb-inline">
            <IssueTypeIcon type={issue.type} size={16} />
            {issue.key}
          </span>
        )
      }
      actions={issue && <InspectorMenu issue={issue} onDeleted={onClose} />}
    >
      {/* Keyed so local drafts reset when switching issues. */}
      {issue && <InspectorBody key={issue.id} issue={issue} />}
    </FloatingInspector>
  );
}

function InspectorMenu({ issue, onDeleted }: { issue: Issue; onDeleted: () => void }) {
  const { dispatch } = useIssues();
  const [confirm, setConfirm] = useState(false);
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copied`, tone: "success", duration: 2500 });
    } catch {
      toast({ title: "Clipboard unavailable", description: text, tone: "warning" });
    }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label="More actions" icon={<MoreHorizontal size={18} />} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            icon={<Link2 size={15} />}
            onSelect={() =>
              copy(`${location.origin}${location.pathname}#/board/${issue.key}`, "Link")
            }
          >
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem icon={<Copy size={15} />} onSelect={() => copy(issue.key, "Issue key")}>
            Copy key
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            icon={<Trash2 size={15} />}
            tone="danger"
            onSelect={() => setConfirm(true)}
          >
            Delete issue…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent size="sm" role="alertdialog">
          <DialogHeader>
            <DialogTitle>Delete {issue.key}?</DialogTitle>
            <DialogDescription>
              “{issue.title}” and its comments will be removed. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: "delete", id: issue.id });
                setConfirm(false);
                onDeleted();
                toast({ title: `${issue.key} deleted`, tone: "success" });
              }}
            >
              Delete issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InspectorBody({ issue }: { issue: Issue }) {
  const { dispatch, personById } = useIssues();
  const [newSubtask, setNewSubtask] = useState("");
  const update = (patch: Partial<Issue>, log?: string) =>
    dispatch({ type: "update", id: issue.id, patch, log });
  const reporter = personById(issue.reporterId);
  const done = issue.subtasks.filter((s) => s.done).length;

  const addSubtask = (e: FormEvent) => {
    e.preventDefault();
    const title = newSubtask.trim();
    if (!title) return;
    dispatch({ type: "addSubtask", id: issue.id, title });
    setNewSubtask("");
  };

  const id = (name: string) => `inspector-${name}`;
  return (
    <IssueDetailPanel
      title={
        <EditableText
          as="h3"
          label="Summary"
          value={issue.title}
          onCommit={(title) => update({ title }, "updated the summary")}
        />
      }
      toolbar={
        <StatusSelector
          value={issue.status}
          statuses={statuses}
          onValueChange={(s) =>
            dispatch({ type: "move", id: issue.id, status: s as StatusId, index: 0 })
          }
        />
      }
      properties={[
        {
          label: "Assignee",
          controlId: id("assignee"),
          value: (
            <AssigneeSelector
              id={id("assignee")}
              appearance="ghost"
              size="sm"
              people={people}
              currentUserId={CURRENT_USER_ID}
              value={issue.assigneeId}
              onValueChange={(assigneeId) =>
                update(
                  { assigneeId },
                  assigneeId
                    ? `assigned this to ${personById(assigneeId)?.name}`
                    : "unassigned this issue",
                )
              }
            />
          ),
        },
        {
          label: "Priority",
          controlId: id("priority"),
          value: (
            <PrioritySelector
              id={id("priority")}
              appearance="ghost"
              size="sm"
              value={issue.priority}
              onValueChange={(priority) =>
                update({ priority }, `changed priority to ${priorityLabels[priority]}`)
              }
            />
          ),
        },
        {
          label: "Labels",
          controlId: id("labels"),
          value: (
            <Combobox
              id={id("labels")}
              multiple
              appearance="ghost"
              size="sm"
              aria-label="Labels"
              options={labels.map((l) => ({ value: l.value, label: l.label }))}
              value={issue.labels}
              onValueChange={(v) => update({ labels: v }, "updated labels")}
              placeholder="Add labels"
              searchPlaceholder="Search labels…"
              renderValue={(sel) => (
                <span className="flex flex-wrap gap-1">
                  {sel.map((o) => (
                    <Tag
                      key={o.value}
                      size="sm"
                      color={labels.find((l) => l.value === o.value)?.color}
                    >
                      {o.label}
                    </Tag>
                  ))}
                </span>
              )}
            />
          ),
        },
        {
          label: "Due date",
          controlId: id("due"),
          value: (
            <DatePicker
              id={id("due")}
              appearance="ghost"
              size="sm"
              aria-label="Due date"
              value={issue.dueDate}
              placeholder="No due date"
              clearable
              onClear={() => update({ dueDate: null }, "removed the due date")}
              onValueChange={(dueDate) =>
                update({ dueDate }, `set the due date to ${fmtDate(dueDate)}`)
              }
            />
          ),
        },
        {
          label: "Sprint",
          controlId: id("sprint"),
          value: (
            <Select
              id={id("sprint")}
              appearance="ghost"
              size="sm"
              aria-label="Sprint"
              value={issue.sprint ?? "backlog"}
              onValueChange={(v) =>
                update(
                  { sprint: v === "backlog" ? null : v },
                  v === "backlog" ? "moved this to the backlog" : `added this to ${sprint.name}`,
                )
              }
              options={[
                { value: sprint.id, label: `${sprint.name} (active)` },
                { value: "backlog", label: "Backlog" },
              ]}
            />
          ),
        },
        {
          label: "Estimate",
          controlId: id("estimate"),
          value: (
            <Input
              id={id("estimate")}
              size="sm"
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              className="max-w-24"
              value={issue.estimate ?? ""}
              aria-label="Estimate in story points"
              onChange={(e) =>
                update({
                  estimate:
                    e.target.value === ""
                      ? null
                      : Math.max(0, Math.min(100, Number(e.target.value))),
                })
              }
            />
          ),
        },
        {
          label: "Reporter",
          value: reporter && (
            <span className="orb-inline px-2 text-sm">
              <Avatar name={reporter.name} size="xs" decorative />
              {reporter.name}
            </span>
          ),
        },
        {
          label: "Created",
          value: <span className="px-2 text-sm text-fg-muted">{fmtDate(issue.createdAt)}</span>,
        },
      ]}
    >
      <IssueDetailSection title="Description">
        <EditableText
          multiline
          label="Description"
          placeholder="Add a description…"
          value={issue.description}
          onCommit={(description) => update({ description }, "updated the description")}
        />
      </IssueDetailSection>

      <IssueDetailSection
        title="Subtasks"
        meta={issue.subtasks.length ? `${done} of ${issue.subtasks.length}` : undefined}
      >
        {issue.subtasks.length > 0 && (
          <Progress
            value={done}
            max={issue.subtasks.length}
            size="sm"
            tone={done === issue.subtasks.length ? "success" : "accent"}
            label="Subtask progress"
          />
        )}
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {issue.subtasks.map((s) => (
            <li key={s.id}>
              <Checkbox
                label={
                  <span className={s.done ? "text-fg-muted line-through" : undefined}>
                    {s.title}
                  </span>
                }
                checked={s.done}
                onCheckedChange={() =>
                  dispatch({ type: "toggleSubtask", id: issue.id, subtaskId: s.id })
                }
              />
            </li>
          ))}
        </ul>
        <form onSubmit={addSubtask} className="flex gap-2">
          <Input
            size="sm"
            aria-label="New subtask"
            placeholder="Add a subtask"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
          />
          <Button
            size="sm"
            type="submit"
            variant="secondary"
            leadingIcon={<Plus size={14} />}
            disabled={!newSubtask.trim()}
          >
            Add
          </Button>
        </form>
      </IssueDetailSection>

      <Tabs defaultValue="comments">
        <TabsList aria-label="Discussion">
          <TabsTrigger value="comments" count={issue.comments.length}>
            Comments
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="comments" className="pt-4">
          <CommentThread
            currentUser={personById(CURRENT_USER_ID)!}
            comments={issue.comments.map((c) => ({
              id: c.id,
              author: personById(c.authorId) ?? { name: "Unknown" },
              body: c.body,
              createdAt: c.createdAt,
            }))}
            onSubmit={(body) => {
              dispatch({ type: "comment", id: issue.id, body });
              toast({ title: "Comment added", tone: "success", duration: 2500 });
            }}
          />
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          <ActivityFeed
            items={[...issue.activity].reverse().map((a) => ({
              id: a.id,
              actor: personById(a.actorId) ?? { name: "Someone" },
              action: a.text,
              timestamp: a.at,
            }))}
          />
        </TabsContent>
      </Tabs>
    </IssueDetailPanel>
  );
}
