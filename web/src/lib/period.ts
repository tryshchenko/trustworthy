/** Date-range presets and URL state for the dashboard. All dates are ISO "YYYY-MM-DD" in the site's time zone. */

export type PeriodId = "today" | "yesterday" | "7d" | "30d" | "90d" | "month" | "lastmonth" | "12m" | "year" | "custom";
export type CompareMode = "previous" | "year" | "none";

export interface PeriodPreset {
  id: Exclude<PeriodId, "custom">;
  label: string;
  short: string;
}

export const presets: PeriodPreset[] = [
  { id: "today", label: "Today", short: "Today" },
  { id: "yesterday", label: "Yesterday", short: "Yesterday" },
  { id: "7d", label: "Last 7 days", short: "7D" },
  { id: "30d", label: "Last 30 days", short: "30D" },
  { id: "90d", label: "Last 90 days", short: "90D" },
  { id: "month", label: "This month", short: "Month" },
  { id: "lastmonth", label: "Last month", short: "Last month" },
  { id: "12m", label: "Last 12 months", short: "12M" },
  { id: "year", label: "This year", short: "Year" },
];

/** Today's date in a time zone. */
export function todayIn(timeZone: string, now = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000) + 1;
}

export function resolvePeriod(id: PeriodId, today: string, custom?: { from?: string | null; to?: string | null }): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const monthStart = (yy: number, mm: number) => toISO(new Date(Date.UTC(yy, mm - 1, 1)));
  switch (id) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "month":
      return { from: monthStart(y, m), to: today };
    case "lastmonth": {
      const first = monthStart(y, m);
      return { from: monthStart(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1), to: addDays(first, -1) };
    }
    case "12m":
      return { from: addDays(today, -364), to: today };
    case "year":
      return { from: `${y}-01-01`, to: today };
    case "custom":
      if (custom?.from && custom?.to && isISODate(custom.from) && isISODate(custom.to) && custom.from <= custom.to) {
        return { from: custom.from, to: custom.to };
      }
      return resolvePeriod("30d", today);
    default:
      return { from: addDays(today, -29), to: today };
  }
}

export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime());
}

export interface Filter {
  dim: string;
  value: string;
}

export interface DashboardState {
  period: PeriodId;
  from: string;
  to: string;
  compare: CompareMode;
  filters: Filter[];
}

const periodIds = new Set<string>([...presets.map((p) => p.id), "custom"]);

/** Reads dashboard state from URL search params. */
export function readState(params: URLSearchParams, timeZone: string, now = new Date()): DashboardState {
  const raw = params.get("period") ?? "30d";
  const period = (periodIds.has(raw) ? raw : "30d") as PeriodId;
  const today = todayIn(timeZone, now);
  const { from, to } = resolvePeriod(period, today, { from: params.get("from"), to: params.get("to") });
  const c = params.get("compare");
  const compare: CompareMode = c === "year" || c === "none" ? c : "previous";
  const filters = params
    .getAll("filter")
    .map((f) => {
      const i = f.indexOf(":");
      return i > 0 ? { dim: f.slice(0, i), value: f.slice(i + 1) } : null;
    })
    .filter((f): f is Filter => f !== null);
  return { period, from, to, compare, filters };
}

/** Query string for API calls. */
export function apiQuery(s: DashboardState, extra: Record<string, string | number> = {}): string {
  const q = new URLSearchParams({ from: s.from, to: s.to });
  if (s.compare !== "none") q.set("compare", s.compare);
  for (const f of s.filters) q.append("filter", `${f.dim}:${f.value}`);
  for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
  return q.toString();
}

export function periodLabel(s: DashboardState): string {
  if (s.period !== "custom") return presets.find((p) => p.id === s.period)?.label ?? "";
  return formatRange(s.from, s.to);
}

export function formatRange(from: string, to: string): string {
  const fmt = (iso: string, withYear: boolean) =>
    toDate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: withYear ? "numeric" : undefined, timeZone: "UTC" });
  if (from === to) return fmt(from, true);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${fmt(from, !sameYear)} – ${fmt(to, true)}`;
}

export function compareLabel(mode: CompareMode): string {
  return mode === "year" ? "same period last year" : mode === "previous" ? "previous period" : "";
}
