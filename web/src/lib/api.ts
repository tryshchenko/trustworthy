/** Typed client for the Trustworthy JSON API. */

export interface Session {
  authenticated: boolean;
  setupRequired: boolean;
  email?: string;
  baseUrl?: string;
  version: string;
}

export interface Site {
  id: number;
  domain: string;
  name: string;
  timezone: string;
  retentionDays: number;
  color: string;
  createdAt: string;
  firstHitAt: string | null;
  lastHitAt: string | null;
}

export interface Goal {
  id: number;
  siteId: number;
  name: string;
  kind: "event" | "page";
  match: string;
  createdAt: string;
}

export interface Totals {
  pageviews: number;
  visits: number;
  events: number;
}

export interface Point extends Totals {
  /** Local wall-clock bucket start, "YYYY-MM-DDTHH:mm". */
  time: string;
}

export type Granularity = "hour" | "day" | "week" | "month";

export interface Overview {
  range: { from: string; to: string; granularity: Granularity; timezone: string };
  compareRange: { from: string; to: string } | null;
  totals: Totals;
  compareTotals: Totals | null;
  series: Point[];
  compareSeries: Point[] | null;
}

export type Metric = "pageviews" | "visits" | "events";

export interface BreakdownRow extends Totals {
  value: string;
}

export interface Breakdown {
  dim: string;
  metric: Metric;
  rows: BreakdownRow[];
  total: number;
}

export interface GoalStat extends Goal {
  completions: number;
  rate: number;
  compareCompletions: number | null;
  compareRate: number | null;
}

export interface GoalStats {
  visits: number;
  goals: GoalStat[];
}

export interface Realtime {
  minutes: { time: string; pageviews: number; visits: number }[];
  pageviews: number;
  visits: number;
  events: number;
  pageviewsLast5: number;
  topPages: { label: string; count: number }[];
  topSources: { label: string; count: number }[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
/** Registers a callback for 401 responses (session expired). */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText || "Request failed";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {
      /* not JSON */
    }
    if (res.status === 401 && path !== "/api/login") onUnauthorized?.();
    throw new ApiError(res.status, msg.charAt(0).toUpperCase() + msg.slice(1));
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export interface SiteInput {
  domain: string;
  name: string;
  timezone: string;
  retentionDays?: number;
  color?: string;
}
