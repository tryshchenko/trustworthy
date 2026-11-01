import type { Granularity } from "./api";

const full = new Intl.NumberFormat();
const compactFmt = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/** 1,284 / 12.9K / 4.2M — full below 10,000. */
export function compact(n: number): string {
  return Math.abs(n) < 10_000 ? full.format(n) : compactFmt.format(n);
}

export function number(n: number): string {
  return full.format(n);
}

export function percent(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "–";
  if (n > 0 && n < 0.1) return "<0.1%";
  return `${n.toFixed(n >= 10 || Number.isInteger(n) ? 0 : digits)}%`;
}

export function share(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

export function ratio(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

/** Relative change in percent, or null when there is no baseline. */
export function change(current: number, previous: number | null | undefined): number | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(undefined, { type: "region" });
  } catch {
    return null;
  }
})();

export function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code. */
export function flag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const parseLocal = (t: string) => {
  const [d, hm = "00:00"] = t.split("T");
  const [y, m, day] = d!.split("-").map(Number) as [number, number, number];
  const [h, min] = hm.split(":").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, day, h, min));
};

/** Axis tick label for a bucket. */
export function bucketTick(t: string, g: Granularity): string {
  const d = parseLocal(t);
  const o: Intl.DateTimeFormatOptions = { timeZone: "UTC" };
  if (g === "hour") return d.toLocaleTimeString(undefined, { ...o, hour: "numeric" });
  if (g === "month") return d.toLocaleDateString(undefined, { ...o, month: "short", year: "2-digit" });
  return d.toLocaleDateString(undefined, { ...o, month: "short", day: "numeric" });
}

/** Full tooltip label for a bucket. */
export function bucketLabel(t: string, g: Granularity): string {
  const d = parseLocal(t);
  const o: Intl.DateTimeFormatOptions = { timeZone: "UTC" };
  switch (g) {
    case "hour":
      return d.toLocaleString(undefined, { ...o, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    case "week":
      return `Week of ${d.toLocaleDateString(undefined, { ...o, month: "short", day: "numeric", year: "numeric" })}`;
    case "month":
      return d.toLocaleDateString(undefined, { ...o, month: "long", year: "numeric" });
    default:
      return d.toLocaleDateString(undefined, { ...o, weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** "Nice" axis maximum and tick step for a value range starting at zero. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const s = step < 1 ? 1 : step;
  return { max: Math.ceil(max / s) * s, step: s };
}
