import type { Metric, Totals } from "../lib/api";
import { change, compact, percent, ratio } from "../lib/format";
import { Icon, Skeleton } from "../ui";

/** One honest sentence per number. Visits are arrivals, never people. */
export const metricNote: Record<Metric | "ratio", string> = {
  visits: "Arrivals from outside the site. Not a count of people.",
  pageviews: "Every page load and in-app navigation.",
  ratio: "Pageviews divided by visits, across all traffic.",
  events: "Custom actions your site sends, such as sign-ups.",
};

export function Delta({ current, previous, label }: { current: number; previous: number | null | undefined; label: string }) {
  if (previous == null) return null;
  const c = change(current, previous);
  if (c === null) return <span>New vs {label}</span>;
  const dir = Math.abs(c) < 0.5 ? "flat" : c > 0 ? "up" : "down";
  return (
    <>
      <span className={`delta delta--${dir}`}>
        {dir !== "flat" && <Icon name={dir === "up" ? "arrow-up-right" : "arrow-down-right"} />}
        {dir === "flat" ? "±0%" : percent(Math.abs(c), 0)}
        <span className="sr-only">{dir === "up" ? " increase" : dir === "down" ? " decrease" : " change"}</span>
      </span>
      <span>vs {label}</span>
    </>
  );
}

interface Props {
  totals: Totals | undefined;
  compare: Totals | null | undefined;
  compareLabel: string;
  metric: Metric;
  onMetric: (m: Metric) => void;
}

export function MetricTiles({ totals, compare, compareLabel, metric, onMetric }: Props) {
  const tile = (m: Metric | "ratio", label: string, value: number | undefined, prev: number | null | undefined, format: (n: number) => string) => {
    const body = (
      <>
        <span className="label metric__label">{label}</span>
        <span className="metric__value">{value == null ? <Skeleton width="60%" height="0.9em" /> : format(value)}</span>
        <span className="metric__note">{metricNote[m]}</span>
        <span className="metric__delta">{value != null && <Delta current={value} previous={prev} label={compareLabel} />}</span>
      </>
    );
    return m === "ratio" ? (
      <div key={m} className="metric">
        {body}
      </div>
    ) : (
      <button type="button" key={m} className="metric" aria-pressed={metric === m} onClick={() => onMetric(m)} title={`Chart ${label.toLowerCase()}`}>
        {body}
      </button>
    );
  };
  const vpv = totals ? ratio(totals.pageviews, totals.visits) : undefined;
  const prevVpv = compare ? ratio(compare.pageviews, compare.visits) : compare;
  return (
    <div className="metrics" role="group" aria-label="Key metrics. Select one to chart it.">
      {tile("visits", "Visits", totals?.visits, compare?.visits, compact)}
      {tile("pageviews", "Pageviews", totals?.pageviews, compare?.pageviews, compact)}
      {tile("ratio", "Views per visit", vpv, prevVpv, (n) => (n ? n.toFixed(2) : "–"))}
      {tile("events", "Events", totals?.events, compare?.events, compact)}
    </div>
  );
}
