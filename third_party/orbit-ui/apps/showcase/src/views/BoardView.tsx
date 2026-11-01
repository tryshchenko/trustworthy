import { Inbox, Plus, SearchX } from "@orbit/icons";
import {
  AvatarGroup,
  Avatar,
  Button,
  EmptyState,
  FilterBar,
  GlassPanel,
  KanbanBoard,
  Skeleton,
  SprintHeader,
  Switch,
  issueTypeLabels,
  priorityLabels,
  priorityOrder,
  type KanbanColumnDefinition,
  type KanbanMove,
  type KanbanRenderState,
} from "@orbit/ui";
import {
  forwardRef,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { BoardCard } from "../components/BoardCard";
import { boardSelection } from "../state/selection";
import {
  labels,
  people,
  sprint,
  sprintDates,
  statuses,
  type Issue,
  type StatusId,
} from "../data/mock";
import { isFiltering, matchesFilters, type IssueFilters } from "../state/filters";
import { columnOrder, useIssues } from "../state/store";

interface Props {
  filters: IssueFilters;
  onFiltersChange: (f: IssueFilters) => void;
  selectedKey: string | null;
  onOpenIssue: (key: string) => void;
  onCreate: (status?: StatusId) => void;
}

const columns: KanbanColumnDefinition[] = statuses.map((s) => ({
  id: s.value,
  title: s.label,
  tone: s.tone,
  shape: s.shape,
  wipLimit: s.wipLimit,
}));

// Simulated first network load so the skeleton state is visible once per session.
let hasLoaded = false;

export const BoardView = forwardRef<HTMLInputElement, Props>(function BoardView(
  { filters, onFiltersChange, selectedKey, onOpenIssue, onCreate },
  searchRef,
) {
  const { issues, dispatch, personById } = useIssues();
  const [loading, setLoading] = useState(!hasLoaded);
  const [onlyMine, setOnlyMine] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => {
      hasLoaded = true;
      setLoading(false);
    }, 550);
    return () => window.clearTimeout(t);
  }, [loading]);

  const sprintIssues = useMemo(() => issues.filter((i) => i.sprint === sprint.id), [issues]);
  // Deferred so typing in the search box stays responsive while the board re-filters.
  const deferredFilters = useDeferredValue(filters);
  const effective = useMemo(
    () => (onlyMine ? { ...deferredFilters, assignees: ["u-priya"] } : deferredFilters),
    [deferredFilters, onlyMine],
  );
  const filtering = isFiltering(effective);

  const itemsByColumn = useMemo(() => {
    const visible = sprintIssues.filter((i) => matchesFilters(i, effective));
    return Object.fromEntries(
      statuses.map((s) => [s.value, columnOrder(visible, s.value)]),
    ) as Record<string, Issue[]>;
  }, [sprintIssues, effective]);
  const visibleCount = Object.values(itemsByColumn).reduce((n, l) => n + l.length, 0);

  /** Translate an index in the (possibly filtered) column into an index in the full column. */
  const onMoveItem = useCallback(
    ({ itemId, toColumnId, toIndex }: KanbanMove) => {
      const to = toColumnId as StatusId;
      const visibleDest = (itemsByColumn[to] ?? []).filter((i) => i.id !== itemId);
      const fullDest = columnOrder(issues, to).filter((i) => i.id !== itemId);
      const anchor = visibleDest[toIndex];
      const last = visibleDest[visibleDest.length - 1];
      const index = anchor
        ? fullDest.indexOf(anchor)
        : last
          ? fullDest.indexOf(last) + 1
          : fullDest.length;
      dispatch({ type: "move", id: itemId, status: to, index });
    },
    [itemsByColumn, issues, dispatch],
  );

  const moveVia = useCallback(
    (issue: Issue, status: StatusId, position: "top" | "bottom") =>
      dispatch({
        type: "move",
        id: issue.id,
        status,
        index: position === "top" ? 0 : Number.MAX_SAFE_INTEGER,
      }),
    [dispatch],
  );

  const renderItem = useCallback(
    (issue: Issue, { dragHandleProps, isOverlay }: KanbanRenderState) => (
      <BoardCard
        issue={issue}
        dragHandleProps={dragHandleProps}
        isOverlay={isOverlay}
        onOpen={onOpenIssue}
        onMove={moveVia}
      />
    ),
    [onOpenIssue, moveVia],
  );

  useLayoutEffect(() => boardSelection.set(selectedKey), [selectedKey]);

  const segments = statuses.map((s) => ({
    label: s.label,
    value: sprintIssues.filter((i) => i.status === s.value).length,
    tone: s.tone,
  }));

  const set = (patch: Partial<IssueFilters>) => onFiltersChange({ ...filters, ...patch });
  const assigneeIds = [
    ...new Set(sprintIssues.map((i) => i.assigneeId).filter(Boolean)),
  ] as string[];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <GlassPanel variant="standard" padding="sm" radius="lg" className="!px-4">
        <SprintHeader
          name={sprint.name}
          {...sprintDates()}
          goal={sprint.goal}
          segments={segments}
          actions={
            <AvatarGroup max={4} aria-label="Sprint members">
              {assigneeIds.map((id) => (
                <Avatar key={id} name={personById(id)!.name} size="sm" />
              ))}
            </AvatarGroup>
          }
        />
      </GlassPanel>

      <FilterBar
        query={filters.query}
        onQueryChange={(query) => set({ query })}
        searchPlaceholder="Search board  ( / )"
        resultCount={visibleCount}
        onClearAll={() => {
          setOnlyMine(false);
          onFiltersChange({ query: "", assignees: [], types: [], priorities: [], labels: [] });
        }}
        filters={[
          {
            id: "assignees",
            label: "Assignee",
            value: filters.assignees,
            options: [
              { value: "unassigned", label: "Unassigned" },
              ...people.map((p) => ({
                value: p.id,
                label: p.name,
                icon: <Avatar name={p.name} size="xs" decorative />,
              })),
            ],
          },
          {
            id: "types",
            label: "Type",
            value: filters.types,
            options: (["story", "task", "bug", "epic"] as const).map((t) => ({
              value: t,
              label: issueTypeLabels[t],
            })),
          },
          {
            id: "priorities",
            label: "Priority",
            value: filters.priorities,
            options: priorityOrder.map((p) => ({ value: p, label: priorityLabels[p] })),
          },
          {
            id: "labels",
            label: "Label",
            value: filters.labels,
            options: labels.map((l) => ({ value: l.value, label: l.label })),
          },
        ]}
        onFilterChange={(id, value) => set({ [id]: value } as Partial<IssueFilters>)}
        leading={
          <Switch
            size="sm"
            label="Only my issues"
            checked={onlyMine}
            onCheckedChange={setOnlyMine}
          />
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => onCreate()}
          >
            Add issue
          </Button>
        }
        searchInputRef={searchRef}
      />

      {loading ? (
        <BoardSkeleton />
      ) : filtering && visibleCount === 0 ? (
        <GlassPanel variant="subtle" className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<SearchX size={24} />}
            title="No issues match these filters"
            description="Try a different search term or clear the filters to see the whole sprint."
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setOnlyMine(false);
                  onFiltersChange({
                    query: "",
                    assignees: [],
                    types: [],
                    priorities: [],
                    labels: [],
                  });
                }}
              >
                Clear filters
              </Button>
            }
          />
        </GlassPanel>
      ) : (
        <div className="min-h-0 flex-1 max-lg:min-h-[72dvh]">
          <KanbanBoard
            aria-label={`${sprint.name} board`}
            columns={columns}
            itemsByColumn={itemsByColumn}
            getItemId={getId}
            getItemLabel={getLabel}
            renderItem={renderItem}
            onMoveItem={onMoveItem}
            renderColumnEmpty={(c) => (
              <EmptyState
                size="sm"
                icon={<Inbox size={18} />}
                title={filtering ? "No matches" : `Nothing ${c.title.toLowerCase()}`}
                description={filtering ? undefined : "Drag a card here or create a new issue."}
              />
            )}
            renderColumnFooter={(c) => (
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                leadingIcon={<Plus size={14} />}
                onClick={() => onCreate(c.id as StatusId)}
                className="justify-start!"
              >
                Create issue
              </Button>
            )}
          />
        </div>
      )}
    </div>
  );
});

const getId = (i: Issue) => i.id;
const getLabel = (i: Issue) => `${i.key} ${i.title}`;

function BoardSkeleton() {
  return (
    <div
      className="grid min-h-0 flex-1 auto-cols-[minmax(272px,1fr)] grid-flow-col gap-3 overflow-hidden"
      role="region"
      aria-busy="true"
      aria-label="Loading board"
    >
      {statuses.map((s, i) => (
        <div key={s.value} className="orb-kanban-col p-3">
          <Skeleton width={110} height={14} />
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 4 - (i % 2) }, (_, j) => (
              <div key={j} className="orb-issue-card flex flex-col gap-3 p-3.5">
                <Skeleton lines={2} />
                <div className="flex justify-between">
                  <Skeleton width={64} height={12} />
                  <Skeleton width={22} height={22} radius="full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="orb-sr-only" role="status">
        Loading board…
      </span>
    </div>
  );
}
