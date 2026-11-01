import type { Issue } from "../data/mock";

export interface IssueFilters {
  query: string;
  assignees: string[];
  types: string[];
  priorities: string[];
  labels: string[];
}

export const emptyFilters: IssueFilters = {
  query: "",
  assignees: [],
  types: [],
  priorities: [],
  labels: [],
};

export function isFiltering(f: IssueFilters) {
  return Boolean(
    f.query.trim() ||
    f.assignees.length ||
    f.types.length ||
    f.priorities.length ||
    f.labels.length,
  );
}

/** Pure filter used by the board and the backlog. */
export function matchesFilters(issue: Issue, f: IssueFilters): boolean {
  const q = f.query.trim().toLowerCase();
  if (q && !`${issue.key} ${issue.title}`.toLowerCase().includes(q)) return false;
  if (f.assignees.length && !f.assignees.includes(issue.assigneeId ?? "unassigned")) return false;
  if (f.types.length && !f.types.includes(issue.type)) return false;
  if (f.priorities.length && !f.priorities.includes(issue.priority)) return false;
  if (f.labels.length && !issue.labels.some((l) => f.labels.includes(l))) return false;
  return true;
}
