import type {
  BacklogItem,
  LabelDefinition,
  Person,
  ProjectSummary,
  StatusDefinition,
} from "@orbit/ui";
import { defaultStatuses } from "@orbit/ui";

/** Realistic, shared story data. Stories never import from the demo app. */

export const people: Person[] = [
  { id: "daniel", name: "Daniel Kim", detail: "Backend engineer" },
  { id: "priya", name: "Priya Raman", detail: "Frontend engineer" },
  { id: "lena", name: "Lena Fischer", detail: "Product designer" },
  { id: "marco", name: "Marco Silva", detail: "Platform engineer" },
  { id: "sam", name: "Samuel Okafor", detail: "QA engineer" },
  { id: "ava", name: "Ava Thompson", detail: "Engineering manager" },
];

export const labels: LabelDefinition[] = [
  { value: "backend", label: "Backend", color: "info" },
  { value: "frontend", label: "Frontend", color: "teal" },
  { value: "design", label: "Design", color: "discovery" },
  { value: "security", label: "Security", color: "danger" },
  { value: "performance", label: "Performance", color: "warning" },
  { value: "a11y", label: "Accessibility", color: "success" },
];

export const statuses: StatusDefinition[] = defaultStatuses;

export const projects: ProjectSummary[] = [
  { id: "plat", key: "PLAT", name: "Orbit Platform", color: "#086BEE" },
  { id: "mob", key: "MOB", name: "Orbit Mobile", color: "#12B8AE" },
  { id: "ds", key: "DS", name: "Design System", color: "#7231EF" },
];

export const label = (v: string) => labels.find((l) => l.value === v)!;

export interface StoryIssue {
  id: string;
  key: string;
  title: string;
  type: "story" | "bug" | "task" | "epic";
  status: string;
  priority: "highest" | "high" | "medium" | "low" | "lowest";
  assignee: Person | null;
  labels: LabelDefinition[];
  estimate?: number;
}

export const issues: StoryIssue[] = [
  {
    id: "1",
    key: "PLAT-87",
    title: "User authentication with SSO",
    type: "story",
    status: "in-progress",
    priority: "high",
    assignee: people[0]!,
    labels: [label("backend"), label("security")],
    estimate: 8,
  },
  {
    id: "2",
    key: "PLAT-88",
    title: "Board takes 4s to load with 500+ issues",
    type: "bug",
    status: "in-progress",
    priority: "highest",
    assignee: people[1]!,
    labels: [label("frontend"), label("performance")],
    estimate: 5,
  },
  {
    id: "3",
    key: "PLAT-89",
    title: "Design empty states for new workspaces",
    type: "task",
    status: "in-review",
    priority: "medium",
    assignee: people[2]!,
    labels: [label("design")],
    estimate: 3,
  },
  {
    id: "4",
    key: "PLAT-90",
    title: "Rate-limit public REST API",
    type: "story",
    status: "todo",
    priority: "high",
    assignee: people[3]!,
    labels: [label("backend"), label("security")],
    estimate: 5,
  },
  {
    id: "5",
    key: "PLAT-91",
    title: "Keyboard drag-and-drop on the board",
    type: "story",
    status: "done",
    priority: "high",
    assignee: people[1]!,
    labels: [label("frontend"), label("a11y")],
    estimate: 5,
  },
  {
    id: "6",
    key: "PLAT-92",
    title: "Session expires while typing a long comment",
    type: "bug",
    status: "todo",
    priority: "high",
    assignee: null,
    labels: [label("frontend")],
    estimate: 3,
  },
  {
    id: "7",
    key: "PLAT-93",
    title: "Dark theme contrast regressions in tooltips",
    type: "bug",
    status: "in-review",
    priority: "medium",
    assignee: people[4]!,
    labels: [label("a11y")],
    estimate: 2,
  },
  {
    id: "8",
    key: "PLAT-94",
    title: "Audit log export to CSV",
    type: "task",
    status: "todo",
    priority: "low",
    assignee: people[5]!,
    labels: [label("backend")],
  },
];

/** N synthetic backlog rows for virtualisation stories. */
export function manyBacklogItems(n: number): BacklogItem[] {
  const verbs = ["Fix", "Add", "Refactor", "Investigate", "Document", "Optimise"];
  const nouns = [
    "billing webhooks",
    "search indexing",
    "avatar uploads",
    "export jobs",
    "OAuth scopes",
    "board filters",
  ];
  const prios = ["highest", "high", "medium", "low", "lowest"] as const;
  const types = ["story", "task", "bug"] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `b-${i}`,
    issueKey: `PLAT-${1000 + i}`,
    title: `${verbs[i % verbs.length]} ${nouns[(i * 7) % nouns.length]}`,
    type: types[i % 3]!,
    status: defaultStatuses[i % 4]!.value,
    priority: prios[(i * 3) % 5]!,
    assignee: i % 5 === 0 ? null : people[i % people.length]!,
    labels: i % 2 ? [labels[i % labels.length]!] : [],
    estimate: i % 4 ? [1, 2, 3, 5, 8][i % 5]! : null,
  }));
}
