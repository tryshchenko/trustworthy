import { FlaskConical } from "@orbit/icons";
import { BacklogList, Badge, EmptyState, FilterBar, Switch, type BacklogItem } from "@orbit/ui";
import { useDeferredValue, useMemo, useState } from "react";
import { createStressIssues, labels, statuses } from "../data/mock";
import { matchesFilters, type IssueFilters } from "../state/filters";
import { useIssues } from "../state/store";

interface Props {
  filters: IssueFilters;
  onFiltersChange: (f: IssueFilters) => void;
  selectedKey: string | null;
  onOpenIssue: (key: string) => void;
}

const labelDef = new Map(labels.map((l) => [l.value, l]));

export function IssuesView({ filters, onFiltersChange, selectedKey, onOpenIssue }: Props) {
  const { issues, personById } = useIssues();
  const [stress, setStress] = useState(false);
  const stressIssues = useMemo(() => (stress ? createStressIssues(2000) : []), [stress]);
  // Defer filtering so typing stays responsive on 2,000+ rows (INP).
  const deferredFilters = useDeferredValue(filters);

  const items = useMemo<BacklogItem[]>(() => {
    const all = [...issues, ...stressIssues].filter((i) => matchesFilters(i, deferredFilters));
    return all.map((i) => ({
      id: i.id,
      issueKey: i.key,
      title: i.title,
      type: i.type,
      status: i.status,
      priority: i.priority,
      assignee: personById(i.assigneeId) ?? null,
      labels: i.labels.map((l) => labelDef.get(l)!).filter(Boolean),
      estimate: i.estimate,
    }));
  }, [issues, stressIssues, deferredFilters, personById]);

  const selected = items.find((i) => i.issueKey === selectedKey);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="m-0 text-lg font-semibold">All issues</h2>
          <Badge variant="accent" aria-label={`${items.length} issues`}>
            {items.length.toLocaleString()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <FlaskConical size={16} aria-hidden className="text-fg-muted" />
          <Switch
            size="sm"
            label="Add 2,000 synthetic issues (virtualisation test)"
            checked={stress}
            onCheckedChange={setStress}
          />
        </div>
      </div>
      <FilterBar
        query={filters.query}
        onQueryChange={(query) => onFiltersChange({ ...filters, query })}
        searchPlaceholder="Search all issues"
        resultCount={items.length}
        onClearAll={() =>
          onFiltersChange({ query: "", assignees: [], types: [], priorities: [], labels: [] })
        }
        filters={[
          {
            id: "labels",
            label: "Label",
            value: filters.labels,
            options: labels.map((l) => ({ value: l.value, label: l.label })),
          },
        ]}
        onFilterChange={(_, value) => onFiltersChange({ ...filters, labels: value })}
      />
      <BacklogList
        label="Issues"
        className="min-h-0 flex-1"
        height="100%"
        items={items}
        statuses={statuses}
        selectedId={selected?.id}
        onOpen={(item) => {
          if (item.id.startsWith("stress-")) return;
          onOpenIssue(item.issueKey);
        }}
        empty={<EmptyState title="No issues found" description="Adjust your search or filters." />}
      />
      {stress && (
        <p className="m-0 text-xs text-fg-muted">
          Synthetic issues are generated in memory, aren’t persisted and can’t be opened. Only
          visible rows are rendered.
        </p>
      )}
    </div>
  );
}
