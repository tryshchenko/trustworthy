import { ArrowDownRight, ArrowUpRight, Info, Minus } from "@orbit/icons";
import { Skeleton, Tooltip } from "@orbit/ui";
import type { Metric, Totals } from "../lib/api";
import { change, compact, number, percent, ratio } from "../lib/format";
import { metricColor } from "./TrafficChart";

export const metricHelp: Record<Metric | "ratio", string> = {
  pageviews: "Every time a page on your site is loaded or navigated to.",
  visits:
    "Pageviews that arrived from outside your site: a search, a link, a bookmark or a typed address. Moving between your own pages doesn't add a visit. Nobody is identified, so one person arriving twice counts as two visits — this is not a count of people.",
  events: "Custom events sent from your site, such as sign-ups or downloads.",
  ratio: "Pageviews divided by visits — an average across all traffic, not a per-person figure.",
};

export function Delta({ current, previous, invert = false, label }: { current: number; previous: number | null | undefined; invert?: boolean; label: string }) {
  if (previous == null) return null;
  const c = change(current, previous);
  if (c === null) return <span className="text-fg-subtle">new vs {label}</span>;
  const dir = Math.abs(c) < 0.5 ? "flat" : c > 0 ? "up" : "down";
  const good = invert ? dir === "down" : dir === "up";
  const cls = dir === "flat" ? "tw-delta--flat" : good ? "tw-delta--up" : "tw-delta--down";
  const Icon = dir === "flat" ? Minus : dir === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <>
      <span className={`tw-delta ${cls}`}>
        <Icon size={13} aria-hidden />
        {dir === "flat" ? "0%" : `${percent(Math.abs(c), 0)}`}
        <span className="orb-sr-only">{dir === "up" ? " increase" : dir === "down" ? " decrease" : " change"}</span>
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
    const selectable = m !== "ratio";
    const content = (
      <>
        <span className="tw-metric__label">
          {selectable && <span className="tw-metric__key" aria-hidden />}
          {label}
          <Tooltip content={metricHelp[m]}>
            <span tabIndex={0} role="img" aria-label={`About ${label}`} className="inline-grid cursor-help text-fg-subtle">
              <Info size={13} />
            </span>
          </Tooltip>
        </span>
        <span className="tw-metric__value">{value == null ? <Skeleton width={90} height={30} /> : format(value)}</span>
        <span className="tw-metric__foot">{value != null && <Delta current={value} previous={prev} label={compareLabel} />}</span>
      </>
    );
    const style = selectable ? { ["--tw-metric-color" as string]: metricColor[m as Metric] } : undefined;
    return selectable ? (
      <button type="button" key={m} className="tw-metric" style={style} aria-pressed={metric === m} onClick={() => onMetric(m as Metric)} title={`Show ${label.toLowerCase()} in the chart`}>
        {content}
      </button>
    ) : (
      <div key={m} className="tw-metric">
        {content}
      </div>
    );
  };
  const vpv = totals ? ratio(totals.pageviews, totals.visits) : undefined;
  const prevVpv = compare ? ratio(compare.pageviews, compare.visits) : compare;
  return (
    <div className="tw-metrics" role="group" aria-label="Key metrics">
      {tile("visits", "Visits", totals?.visits, compare?.visits, compact)}
      {tile("pageviews", "Pageviews", totals?.pageviews, compare?.pageviews, compact)}
      {tile("ratio", "Views per visit", vpv, prevVpv, (n) => (n ? n.toFixed(2) : "–"))}
      {tile("events", "Events", totals?.events, compare?.events, compact)}
    </div>
  );
}

export { number };
