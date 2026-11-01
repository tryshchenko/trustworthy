import type {
  IssuePriority,
  IssueType,
  LabelDefinition,
  Person,
  ProjectSummary,
  StatusDefinition,
} from "@orbit/ui";

/* Domain model for the demo app. @orbit/ui never sees this type directly — views
   map it onto the library's presentational props. */

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface IssueComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface IssueEvent {
  id: string;
  actorId: string;
  text: string;
  at: string;
}

export interface Issue {
  id: string;
  key: string;
  projectId: string;
  title: string;
  description: string;
  type: IssueType;
  status: StatusId;
  priority: IssuePriority;
  assigneeId: string | null;
  reporterId: string;
  labels: string[];
  dueDate: string | null;
  sprint: string | null;
  estimate: number | null;
  /** Ordering within a status column (lower = higher). */
  rank: number;
  subtasks: Subtask[];
  comments: IssueComment[];
  activity: IssueEvent[];
  createdAt: string;
}

export type StatusId = "todo" | "in-progress" | "in-review" | "done";

export const statuses: (StatusDefinition & { value: StatusId; wipLimit?: number })[] = [
  { value: "todo", label: "To do", tone: "neutral", shape: "todo" },
  { value: "in-progress", label: "In progress", tone: "info", shape: "progress", wipLimit: 6 },
  { value: "in-review", label: "In review", tone: "discovery", shape: "review", wipLimit: 4 },
  { value: "done", label: "Done", tone: "success", shape: "done" },
];

export const people: Person[] = [
  { id: "u-ava", name: "Ava Thompson", detail: "Engineering manager" },
  { id: "u-daniel", name: "Daniel Kim", detail: "Backend engineer" },
  { id: "u-priya", name: "Priya Raman", detail: "Frontend engineer" },
  { id: "u-marco", name: "Marco Silva", detail: "Platform engineer" },
  { id: "u-lena", name: "Lena Fischer", detail: "Product designer" },
  { id: "u-sam", name: "Samuel Okafor", detail: "QA engineer" },
  { id: "u-yuki", name: "Yuki Tanaka", detail: "Data engineer" },
  { id: "u-noah", name: "Noah Bennett", detail: "Product manager" },
];

export const CURRENT_USER_ID = "u-priya";

export const labels: LabelDefinition[] = [
  { value: "backend", label: "Backend", color: "info" },
  { value: "frontend", label: "Frontend", color: "teal" },
  { value: "design", label: "Design", color: "discovery" },
  { value: "security", label: "Security", color: "danger" },
  { value: "performance", label: "Performance", color: "warning" },
  { value: "infra", label: "Infra", color: "neutral" },
  { value: "a11y", label: "Accessibility", color: "success" },
  { value: "api", label: "API", color: "info" },
];

export const projects: (ProjectSummary & { description: string })[] = [
  {
    id: "plat",
    key: "PLAT",
    name: "Orbit Platform",
    color: "#086BEE",
    description: "Core platform services, identity and the web client.",
  },
  {
    id: "mob",
    key: "MOB",
    name: "Orbit Mobile",
    color: "#12B8AE",
    description: "iOS and Android companion apps.",
  },
  {
    id: "ds",
    key: "DS",
    name: "Design System",
    color: "#7231EF",
    description: "Orbit UI tokens, components and documentation.",
  },
];

export const sprint = {
  id: "sprint-24",
  name: "Sprint 24",
  goal: "Ship SSO for enterprise workspaces and cut board load time in half.",
};

/* ---------------------------------------------------------------- helpers */

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString();
const isoDate = (d: Date) => iso(d).slice(0, 10);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);
const hoursAgo = (n: number) => iso(new Date(Date.now() - n * 3_600_000));

export function sprintDates() {
  return { startDate: isoDate(daysFromNow(-5)), endDate: isoDate(daysFromNow(9)) };
}

type Seed = [
  title: string,
  type: IssueType,
  status: StatusId,
  priority: IssuePriority,
  assigneeId: string | null,
  labels: string[],
  estimate: number | null,
  due: number | null,
  description?: string,
  subtasks?: [string, boolean][],
];

const seeds: Seed[] = [
  [
    "User authentication with SSO",
    "story",
    "in-progress",
    "high",
    "u-daniel",
    ["backend", "security"],
    8,
    4,
    "Allow enterprise workspaces to sign in with SAML 2.0 and OIDC identity providers.\n\nAcceptance criteria:\n• Admins can configure an IdP from workspace settings\n• Just-in-time provisioning creates members on first login\n• Existing password logins keep working until SSO is enforced",
    [
      ["SAML assertion parsing", true],
      ["OIDC discovery + JWKS caching", true],
      ["JIT provisioning", false],
      ["Admin settings UI", false],
    ],
  ],
  [
    "Board takes 4s to load with 500+ issues",
    "bug",
    "in-progress",
    "highest",
    "u-priya",
    ["frontend", "performance"],
    5,
    2,
    "Profiling shows every card re-renders on each drag-over event and the column lists are not windowed.\n\nExpected: < 1.5s on a mid-range laptop.",
    [
      ["Memoise card rendering", true],
      ["Paginate long columns", false],
      ["Add perf regression test", false],
    ],
  ],
  [
    "Design empty states for new workspaces",
    "task",
    "in-review",
    "medium",
    "u-lena",
    ["design"],
    3,
    6,
    "Friendly, on-brand empty states for boards, backlog and search with a clear primary action.",
  ],
  [
    "Rate-limit public REST API",
    "story",
    "todo",
    "high",
    "u-marco",
    ["backend", "api", "security"],
    5,
    8,
    "Token-bucket limits per API key with `Retry-After` headers and dashboard visibility.",
  ],
  [
    "Keyboard drag-and-drop on the board",
    "story",
    "done",
    "high",
    "u-priya",
    ["frontend", "a11y"],
    5,
    null,
    "Space to lift, arrows to move, Space to drop. Announce every step to screen readers.",
  ],
  ["Audit log export to CSV", "task", "todo", "medium", "u-yuki", ["backend"], 3, 10],
  [
    "Dark theme contrast regressions in tooltips",
    "bug",
    "in-review",
    "medium",
    "u-sam",
    ["frontend", "a11y"],
    2,
    1,
    "Tooltip text drops to 3.9:1 on the navy surface. Should meet 4.5:1.",
  ],
  [
    "Migrate CI runners to ARM",
    "task",
    "in-progress",
    "low",
    "u-marco",
    ["infra", "performance"],
    3,
    12,
  ],
  [
    "Webhooks retry with exponential backoff",
    "story",
    "todo",
    "medium",
    "u-daniel",
    ["backend", "api"],
    5,
    null,
  ],
  ["Inline editing for issue titles", "story", "done", "medium", "u-priya", ["frontend"], 2, null],
  [
    "Session expires while typing a long comment",
    "bug",
    "todo",
    "high",
    null,
    ["frontend", "security"],
    3,
    3,
    "If the access token expires mid-draft the comment is lost on submit. Refresh silently and preserve the draft.",
  ],
  [
    "Usage analytics pipeline for board views",
    "task",
    "in-progress",
    "medium",
    "u-yuki",
    ["backend", "performance"],
    5,
    7,
  ],
  [
    "Q4 enterprise onboarding",
    "epic",
    "in-progress",
    "high",
    "u-noah",
    [],
    null,
    40,
    "Everything needed to onboard the first five enterprise customers: SSO, SCIM, audit logs and admin controls.",
  ],
  ["SCIM user provisioning", "story", "todo", "high", "u-daniel", ["backend", "security"], 8, 14],
  ["Command palette fuzzy matching", "task", "done", "low", "u-priya", ["frontend"], 2, null],
  [
    "Reduce bundle size of the editor",
    "task",
    "todo",
    "medium",
    "u-priya",
    ["frontend", "performance"],
    3,
    null,
  ],
  ["Accessible date picker", "story", "in-review", "medium", "u-lena", ["design", "a11y"], 3, 5],
  ["Notifications digest email", "story", "todo", "low", "u-noah", ["backend"], 3, null],
  ["Flaky e2e test: create issue dialog", "bug", "in-progress", "medium", "u-sam", ["infra"], 1, 2],
  [
    "Postgres connection pool exhaustion under load",
    "bug",
    "done",
    "highest",
    "u-marco",
    ["backend", "infra"],
    5,
    null,
  ],
  [
    "Workspace switcher in mobile nav",
    "task",
    "todo",
    "low",
    "u-lena",
    ["design", "frontend"],
    2,
    null,
  ],
  [
    "Project-level permissions model",
    "story",
    "todo",
    "medium",
    "u-ava",
    ["backend", "security"],
    8,
    21,
  ],
  ["Sprint burndown chart", "story", "in-review", "medium", "u-yuki", ["frontend"], 5, 4],
  [
    "Translate UI strings to German and Japanese",
    "task",
    "done",
    "low",
    "u-noah",
    ["frontend"],
    3,
    null,
  ],
];

/** Build the initial demo dataset (deterministic content, dates relative to today). */
export function createSeedIssues(): Issue[] {
  const rankByStatus: Record<string, number> = {};
  return seeds.map((s, i) => {
    const [
      title,
      type,
      status,
      priority,
      assigneeId,
      lbls,
      estimate,
      due,
      description = "",
      subtasks = [],
    ] = s;
    const n = 87 + i;
    rankByStatus[status] = (rankByStatus[status] ?? 0) + 1;
    const reporterId = people[(i + 3) % people.length]!.id;
    const created = hoursAgo(24 * (12 - (i % 10)) + i);
    const comments =
      i % 3 === 0
        ? [
            {
              id: `c-${i}-1`,
              authorId: people[(i + 2) % people.length]!.id,
              body: "I can pick up the review once the API contract is final.",
              createdAt: hoursAgo(30 - i),
            },
            {
              id: `c-${i}-2`,
              authorId: assigneeId ?? "u-ava",
              body: "Pushed a first pass — feedback welcome on the edge cases.",
              createdAt: hoursAgo(5 + (i % 4)),
            },
          ]
        : [];
    return {
      id: `issue-${n}`,
      key: `PLAT-${n}`,
      projectId: "plat",
      title,
      description,
      type,
      status,
      priority,
      assigneeId,
      reporterId,
      labels: lbls,
      dueDate: due == null ? null : isoDate(daysFromNow(due)),
      sprint: type === "epic" ? null : sprint.id,
      estimate,
      rank: rankByStatus[status]!,
      subtasks: subtasks.map(([t, done], j) => ({ id: `st-${i}-${j}`, title: t, done })),
      comments,
      activity: [
        { id: `a-${i}-0`, actorId: reporterId, text: "created this issue", at: created },
        ...(status !== "todo"
          ? [
              {
                id: `a-${i}-1`,
                actorId: assigneeId ?? reporterId,
                text: `moved this to ${statuses.find((x) => x.value === status)!.label}`,
                at: hoursAgo(20 - (i % 12)),
              },
            ]
          : []),
      ],
      createdAt: created,
    };
  });
}

/* --------------------------------------------- stress-test data generator */

const verbs = [
  "Refactor",
  "Investigate",
  "Add",
  "Fix",
  "Document",
  "Optimise",
  "Migrate",
  "Design",
  "Test",
  "Remove",
];
const nouns = [
  "billing webhooks",
  "search indexing",
  "avatar uploads",
  "export jobs",
  "rate limiter",
  "OAuth scopes",
  "board filters",
  "comment mentions",
  "timezone handling",
  "file previews",
  "audit trail",
  "API pagination",
];
const types: IssueType[] = ["story", "task", "bug", "task", "story"];
const prios: IssuePriority[] = ["highest", "high", "medium", "medium", "low", "lowest"];
const statusIds: StatusId[] = ["todo", "todo", "in-progress", "in-review", "done"];

/** Generate N synthetic backlog issues to demonstrate virtualised rendering. */
export function createStressIssues(count: number): Issue[] {
  let seed = 42;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;
  return Array.from({ length: count }, (_, i) => {
    const n = 1000 + i;
    return {
      id: `stress-${n}`,
      key: `PLAT-${n}`,
      projectId: "plat",
      title: `${pick(verbs)} ${pick(nouns)}`,
      description: "",
      type: pick(types),
      status: pick(statusIds),
      priority: pick(prios),
      assigneeId: rand() > 0.15 ? pick(people).id : null,
      reporterId: pick(people).id,
      labels: rand() > 0.4 ? [pick(labels).value] : [],
      dueDate: null,
      sprint: null,
      estimate: rand() > 0.3 ? pick([1, 2, 3, 5, 8]) : null,
      rank: i,
      subtasks: [],
      comments: [],
      activity: [],
      createdAt: hoursAgo(i),
    };
  });
}
