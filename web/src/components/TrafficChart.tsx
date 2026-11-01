import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Granularity, Metric, Point } from "../lib/api";
import { bucketLabel, bucketTick, compact, niceScale, number } from "../lib/format";

export const metricColor: Record<Metric, string> = {
  pageviews: "var(--tw-series-pageviews)",
  visits: "var(--tw-series-visits)",
  events: "var(--tw-series-events)",
};

export const metricName: Record<Metric, string> = {
  pageviews: "Pageviews",
  visits: "Visits",
  events: "Events",
};

interface Props {
  series: Point[];
  compare: Point[] | null;
  metric: Metric;
  granularity: Granularity;
  /** Buckets after this local wall-clock key ("YYYY-MM-DDTHH:mm") are in the future and not drawn. */
  nowKey?: string;
  compareName?: string;
  /** The last visible bucket is still in progress (the range includes now). */
  partialLast?: boolean;
  height?: number;
}

const M = { top: 14, right: 14, bottom: 28, left: 46 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e!.contentRect.width)));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Single-metric area chart with an optional comparison reference line. */
export function TrafficChart({ series, compare, metric, granularity, nowKey, compareName = "Previous period", partialLast = false, height = 280 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, "");

  const n = series.length;
  const color = metricColor[metric];
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;

  // Drop buckets that haven't happened yet (e.g. later today) so the line doesn't fall to zero.
  const visibleN = useMemo(() => {
    if (!nowKey) return n;
    let k = n;
    while (k > 1 && series[k - 1]!.time > nowKey) k--;
    return k;
  }, [series, nowKey, n]);

  const values = series.map((p) => p[metric]);
  const cmpValues = compare?.map((p) => p[metric]) ?? null;
  const maxVal = Math.max(1, ...values.slice(0, visibleN), ...(cmpValues ?? []));
  const scale = niceScale(maxVal);

  const x = (i: number) => (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => innerH - (v / scale.max) * innerH;

  const line = (vals: number[], count: number) =>
    vals
      .slice(0, count)
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join("");
  const curLine = line(values, visibleN);
  // An in-progress bucket is drawn faded so a partial day doesn't read as a drop.
  const fade = partialLast && visibleN >= 2;
  const solidLine = fade ? line(values, visibleN - 1) : curLine;
  const partialSeg = fade
    ? `M${x(visibleN - 2).toFixed(1)},${y(values[visibleN - 2] ?? 0).toFixed(1)}L${x(visibleN - 1).toFixed(1)},${y(values[visibleN - 1] ?? 0).toFixed(1)}`
    : "";
  const area = visibleN > 0 ? `${curLine}L${x(visibleN - 1).toFixed(1)},${innerH}L${x(0).toFixed(1)},${innerH}Z` : "";
  const cmpLine = cmpValues ? line(cmpValues, Math.min(cmpValues.length, n)) : "";

  const yTicks: number[] = [];
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) yTicks.push(v);
  const maxXTicks = Math.max(2, Math.floor(innerW / 76));
  const xStep = Math.max(1, Math.ceil(n / maxXTicks));

  const pick = (clientX: number, el: Element) => {
    if (n === 0) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left - M.left;
    const i = n <= 1 ? 0 : Math.round((px / innerW) * (n - 1));
    setActive(Math.max(0, Math.min(visibleN - 1, i)));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.max(0, Math.min(visibleN - 1, (a ?? (d > 0 ? -1 : visibleN)) + d)));
    } else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(visibleN - 1);
    else if (e.key === "Escape") setActive(null);
  };

  const total = values.slice(0, visibleN).reduce((a, b) => a + b, 0);
  const summary = `${metricName[metric]} over time: ${number(total)} in total across ${visibleN} ${granularity}s.`;

  const a = active != null && active < n ? active : null;
  const ax = a != null ? x(a) + M.left : 0;
  const tooltipLeft = a != null ? (ax + 196 > width ? ax - 196 - 8 : ax + 12) : 0;

  return (
    <div
      ref={ref}
      className="tw-chart"
      tabIndex={0}
      role="group"
      aria-label={`${summary} Use the arrow keys to read values.`}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={summary}
          onPointerMove={(e: PointerEvent<SVGSVGElement>) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e: PointerEvent<SVGSVGElement>) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: color, stopOpacity: 0.16 }} />
              <stop offset="1" style={{ stopColor: color, stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>
          <g transform={`translate(${M.left},${M.top})`}>
            {yTicks.map((v) => (
              <g key={v}>
                <line className="tw-chart__grid" x1={0} x2={innerW} y1={Math.round(y(v)) + 0.5} y2={Math.round(y(v)) + 0.5} />
                <text className="tw-chart__axis" x={-10} y={y(v)} dy="0.32em" textAnchor="end">
                  {compact(v)}
                </text>
              </g>
            ))}
            {series.map((p, i) =>
              i % xStep === 0 ? (
                <text key={p.time} className="tw-chart__axis" x={x(i)} y={innerH + 18} textAnchor={n <= 1 ? "middle" : i === 0 ? "start" : "middle"}>
                  {bucketTick(p.time, granularity)}
                </text>
              ) : null,
            )}
            {cmpLine && (
              <path d={cmpLine} fill="none" style={{ stroke: "var(--tw-series-compare)" }} strokeOpacity={0.75} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {area && <path d={area} fill={`url(#${gradId})`} />}
            {solidLine && <path d={solidLine} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
            {partialSeg && <path d={partialSeg} fill="none" style={{ stroke: color }} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />}
            {visibleN === 1 && <circle cx={x(0)} cy={y(values[0] ?? 0)} r={4} style={{ fill: color }} stroke="#fff" strokeWidth={2} />}
            {a != null && (
              <g>
                <line className="tw-chart__crosshair" x1={Math.round(x(a)) + 0.5} x2={Math.round(x(a)) + 0.5} y1={0} y2={innerH} />
                {cmpValues && cmpValues[a] != null && (
                  <circle cx={x(a)} cy={y(cmpValues[a]!)} r={4} style={{ fill: "var(--tw-series-compare)" }} stroke="#fff" strokeWidth={2} />
                )}
                <circle cx={x(a)} cy={y(values[a] ?? 0)} r={5} style={{ fill: color }} stroke="#fff" strokeWidth={2} />
              </g>
            )}
          </g>
        </svg>
      )}
      {a != null && (
        <div className="tw-tooltip" style={{ transform: `translate(${tooltipLeft}px, ${M.top}px)` }} role="status" aria-live="polite">
          <div className="tw-tooltip__title">
            {bucketLabel(series[a]!.time, granularity)}
            {partialLast && a === visibleN - 1 ? " · so far" : ""}
          </div>
          <div className="tw-tooltip__row">
            <span className="tw-linekey" style={{ ["--tw-key" as string]: color }} />
            <strong>{number(values[a] ?? 0)}</strong>
            <span>{metricName[metric]}</span>
          </div>
          {cmpValues && compare?.[a] && (
            <div className="tw-tooltip__row">
              <span className="tw-linekey" style={{ ["--tw-key" as string]: "var(--tw-series-compare)" }} />
              <strong>{number(cmpValues[a] ?? 0)}</strong>
              <span>{bucketLabel(compare[a]!.time, granularity)}</span>
            </div>
          )}
        </div>
      )}
      <span className="orb-sr-only">{compare ? `Compared with ${compareName.toLowerCase()}.` : ""}</span>
    </div>
  );
}

export function ChartLegend({ metric, compareName }: { metric: Metric; compareName: string | null }) {
  return (
    <div className="tw-legend" aria-hidden>
      <span>
        <span className="tw-linekey" style={{ ["--tw-key" as string]: metricColor[metric] }} />
        {metricName[metric]} · this period
      </span>
      {compareName && (
        <span>
          <span className="tw-linekey" style={{ ["--tw-key" as string]: "var(--tw-series-compare)" }} />
          {compareName}
        </span>
      )}
    </div>
  );
}

/** Accessible table view of the same series. */
export function ChartTable({ series, compare, metric, granularity }: Omit<Props, "height" | "nowKey" | "compareName">) {
  return (
    <div className="max-h-[320px] overflow-auto rounded-md border border-line">
      <table className="tw-table">
        <caption className="orb-sr-only">{metricName[metric]} by {granularity}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col" className="num">
              {metricName[metric]}
            </th>
            {compare && (
              <th scope="col" className="num">
                Comparison
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {series.map((p, i) => (
            <tr key={p.time}>
              <th scope="row" className="font-normal">
                {bucketLabel(p.time, granularity)}
              </th>
              <td className="num">{number(p[metric])}</td>
              {compare && <td className="num">{compare[i] ? number(compare[i]![metric]) : "–"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
