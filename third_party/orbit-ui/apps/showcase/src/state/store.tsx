import type { IssueDraft } from "@orbit/ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  CURRENT_USER_ID,
  createSeedIssues,
  people,
  sprint,
  statuses,
  type Issue,
  type StatusId,
} from "../data/mock";

const STORAGE_KEY = "orbit-projects:issues:v1";

type Action =
  | { type: "create"; id: string; key: string; draft: IssueDraft }
  | { type: "update"; id: string; patch: Partial<Issue>; log?: string }
  | { type: "move"; id: string; status: StatusId; index: number }
  | { type: "comment"; id: string; body: string }
  | { type: "toggleSubtask"; id: string; subtaskId: string }
  | { type: "addSubtask"; id: string; title: string }
  | { type: "delete"; id: string }
  | { type: "reset" };

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const statusLabel = (s: StatusId) => statuses.find((x) => x.value === s)?.label ?? s;

function event(text: string) {
  return { id: `ev-${uid()}`, actorId: CURRENT_USER_ID, text, at: now() };
}

/** Re-rank one status column so ranks are 1..n in the given order. */
function rerank(issues: Issue[], status: StatusId, orderedIds: string[]): Issue[] {
  const rankOf = new Map(orderedIds.map((id, i) => [id, i + 1]));
  return issues.map((it) =>
    it.status === status && rankOf.has(it.id) ? { ...it, rank: rankOf.get(it.id)! } : it,
  );
}

export function columnOrder(issues: Issue[], status: StatusId) {
  return issues.filter((i) => i.status === status).sort((a, b) => a.rank - b.rank);
}

function reducer(state: Issue[], action: Action): Issue[] {
  switch (action.type) {
    case "create": {
      const d = action.draft;
      const status = d.status as StatusId;
      const issue: Issue = {
        id: action.id,
        key: action.key,
        projectId: "plat",
        title: d.title,
        description: d.description,
        type: d.type,
        status,
        priority: d.priority,
        assigneeId: d.assigneeId,
        reporterId: CURRENT_USER_ID,
        labels: d.labels,
        dueDate: d.dueDate,
        sprint: sprint.id,
        estimate: d.estimate,
        rank: 0, // top of its column
        subtasks: [],
        comments: [],
        activity: [event("created this issue")],
        createdAt: now(),
      };
      const next = [issue, ...state];
      return rerank(
        next,
        status,
        columnOrder(next, status).map((i) => i.id),
      );
    }
    case "update":
      return state.map((it) =>
        it.id === action.id
          ? {
              ...it,
              ...action.patch,
              activity: action.log ? [...it.activity, event(action.log)] : it.activity,
            }
          : it,
      );
    case "move": {
      const issue = state.find((i) => i.id === action.id);
      if (!issue) return state;
      const changed = issue.status !== action.status;
      let next = state.map((it) =>
        it.id === action.id
          ? {
              ...it,
              status: action.status,
              activity: changed
                ? [
                    ...it.activity,
                    event(
                      `moved this from ${statusLabel(issue.status)} to ${statusLabel(action.status)}`,
                    ),
                  ]
                : it.activity,
            }
          : it,
      );
      const dest = columnOrder(next, action.status)
        .filter((i) => i.id !== action.id)
        .map((i) => i.id);
      dest.splice(Math.max(0, Math.min(action.index, dest.length)), 0, action.id);
      next = rerank(next, action.status, dest);
      if (changed)
        next = rerank(
          next,
          issue.status,
          columnOrder(next, issue.status).map((i) => i.id),
        );
      return next;
    }
    case "comment":
      return state.map((it) =>
        it.id === action.id
          ? {
              ...it,
              comments: [
                ...it.comments,
                {
                  id: `c-${uid()}`,
                  authorId: CURRENT_USER_ID,
                  body: action.body,
                  createdAt: now(),
                },
              ],
            }
          : it,
      );
    case "toggleSubtask":
      return state.map((it) =>
        it.id === action.id
          ? {
              ...it,
              subtasks: it.subtasks.map((s) =>
                s.id === action.subtaskId ? { ...s, done: !s.done } : s,
              ),
            }
          : it,
      );
    case "addSubtask":
      return state.map((it) =>
        it.id === action.id
          ? {
              ...it,
              subtasks: [...it.subtasks, { id: `st-${uid()}`, title: action.title, done: false }],
            }
          : it,
      );
    case "delete":
      return state.filter((it) => it.id !== action.id);
    case "reset":
      return createSeedIssues();
  }
}

function load(): Issue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Issue[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* corrupted or unavailable storage → fall back to seed data */
  }
  return createSeedIssues();
}

interface Store {
  issues: Issue[];
  dispatch: (a: Action) => void;
  /** Creates an issue and returns its id. */
  createIssue: (draft: IssueDraft) => { id: string; key: string };
  personById: (id: string | null | undefined) => (typeof people)[number] | undefined;
}

const StoreContext = createContext<Store | null>(null);

export function IssueStoreProvider({ children }: { children: ReactNode }) {
  const [issues, dispatch] = useReducer(reducer, undefined, load);

  // Persist (debounced) so demo edits survive reloads; flush immediately when the page is hidden.
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
      } catch {
        /* quota / private mode */
      }
    };
    const t = window.setTimeout(save, 250);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pagehide", save);
    };
  }, [issues]);

  const personMap = useMemo(() => new Map(people.map((p) => [p.id, p])), []);
  const personById = useCallback(
    (id: string | null | undefined) => (id ? personMap.get(id) : undefined),
    [personMap],
  );

  const createIssue = useCallback(
    (draft: IssueDraft) => {
      const max = Math.max(86, ...issues.map((i) => Number(i.key.split("-")[1]) || 0));
      const created = { id: `issue-${max + 1}-${uid()}`, key: `PLAT-${max + 1}` };
      dispatch({ type: "create", ...created, draft });
      return created;
    },
    [issues],
  );

  const value = useMemo(
    () => ({ issues, dispatch, createIssue, personById }),
    [issues, createIssue, personById],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useIssues() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useIssues must be used inside IssueStoreProvider");
  return ctx;
}
