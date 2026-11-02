import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Granularity, Metric, Point } from "../lib/api";
import { bucketLabel, bucketTick, compact, niceScale, number } from "../lib/format";

export const metricName: Record<Metric, string> = {
  pageviews: "Pageviews",
  visits: "Visits",
  events: "Events",
};

const BLUE = "var(--accent)";
const COMPARE = "var(--compare)";

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

const M = { top: 12, right: 8, bottom: 34, left: 44 };

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

/**
 * One line, one axis. The baseline carries a tick for every bucket, like the
 * minute track of a dial; labelled ticks are longer. The comparison is a
 * dashed grey reference, the in-progress bucket a dashed segment.
 */
export function TrafficChart({ series, compare, metric, granularity, nowKey, compareName = "Previous period", partialLast = false, height = 240 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const n = series.length;
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
  const scale = niceScale(Math.max(1, ...values.slice(0, visibleN), ...(cmpValues ?? [])));

  const x = (i: number) => (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => innerH - (v / scale.max) * innerH;
  const pt = (i: number, v: number) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  const line = (vals: number[], count: number) =>
    vals
      .slice(0, count)
      .map((v, i) => `${i === 0 ? "M" : "L"}${pt(i, v)}`)
      .join("");

  const fade = partialLast && visibleN >= 2;
  const solidLine = line(values, fade ? visibleN - 1 : visibleN);
  const partialSeg = fade ? `M${pt(visibleN - 2, values[visibleN - 2] ?? 0)}L${pt(visibleN - 1, values[visibleN - 1] ?? 0)}` : "";
  const area = visibleN > 1 ? `${line(values, visibleN)}L${x(visibleN - 1).toFixed(1)},${innerH}L${x(0).toFixed(1)},${innerH}Z` : "";
  const cmpLine = cmpValues ? line(cmpValues, Math.min(cmpValues.length, n)) : "";

  const yTicks: number[] = [];
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) yTicks.push(v);
  const xStep = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 84))));
  const minorTicks = n <= 140;

  const pick = (clientX: number, el: Element) => {
    if (n === 0) return;
    const px = clientX - el.getBoundingClientRect().left - M.left;
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
  const tipLeft = a != null ? (ax + 212 > width ? ax - 212 : ax + 12) : 0;

  return (
    <div ref={ref} className="chart" tabIndex={0} role="group" aria-label={`${summary} Use the arrow keys to read values.`} onKeyDown={onKey} onBlur={() => setActive(null)}>
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
          <g transform={`translate(${M.left},${M.top})`}>
            {yTicks.map((v) => (
              <g key={v}>
                {v > 0 && <line className="chart__grid" x1={0} x2={innerW} y1={Math.round(y(v)) + 0.5} y2={Math.round(y(v)) + 0.5} />}
                <text className="chart__axis" x={-12} y={y(v)} dy="0.32em" textAnchor="end">
                  {compact(v)}
                </text>
              </g>
            ))}
            {series.map((p, i) => {
              const major = i % xStep === 0;
              if (!major && !minorTicks) return null;
              const tx = Math.round(x(i)) + 0.5;
              return (
                <g key={p.time}>
                  <line className={major ? "chart__tick" : "chart__tick chart__tick--minor"} x1={tx} x2={tx} y1={innerH} y2={innerH + (major ? 7 : 4)} />
                  {major && (
                    <text className="chart__axis" x={x(i)} y={innerH + 22} textAnchor={n <= 1 ? "middle" : i === 0 ? "start" : "middle"}>
                      {bucketTick(p.time, granularity)}
                    </text>
                  )}
                </g>
              );
            })}
            {area && <path d={area} style={{ fill: BLUE }} fillOpacity={0.06} />}
            {cmpLine && <path d={cmpLine} fill="none" style={{ stroke: COMPARE }} strokeWidth={1.5} strokeDasharray="4 4" strokeLinejoin="round" />}
            {solidLine && <path d={solidLine} fill="none" style={{ stroke: BLUE }} strokeWidth={2} strokeLinejoin="round" />}
            {partialSeg && <path d={partialSeg} fill="none" style={{ stroke: BLUE }} strokeWidth={2} strokeDasharray="3 4" />}
            {visibleN === 1 && <circle cx={x(0)} cy={y(values[0] ?? 0)} r={4} style={{ fill: BLUE }} />}
            <line className="chart__base" x1={0} x2={innerW} y1={innerH + 0.5} y2={innerH + 0.5} />
            {a != null && (
              <g>
                <line className="chart__cross" x1={Math.round(x(a)) + 0.5} x2={Math.round(x(a)) + 0.5} y1={0} y2={innerH} />
                {cmpValues?.[a] != null && <circle cx={x(a)} cy={y(cmpValues[a]!)} r={3.5} style={{ fill: "var(--paper)", stroke: COMPARE }} strokeWidth={1.5} />}
                <circle cx={x(a)} cy={y(values[a] ?? 0)} r={4.5} style={{ fill: "var(--paper)", stroke: BLUE }} strokeWidth={2} />
              </g>
            )}
          </g>
        </svg>
      )}
      {a != null && (
        <div className="tooltip" style={{ transform: `translate(${tipLeft}px, ${M.top}px)` }} role="status" aria-live="polite">
          <div className="tooltip__title label">
            {bucketLabel(series[a]!.time, granularity)}
            {partialLast && a === visibleN - 1 ? " · so far" : ""}
          </div>
          <div className="tooltip__row">
            <span className="key" />
            <strong>{number(values[a] ?? 0)}</strong>
            <span>{metricName[metric].toLowerCase()}</span>
          </div>
          {cmpValues && compare?.[a] && (
            <div className="tooltip__row">
              <span className="key key--compare" />
              <strong>{number(cmpValues[a] ?? 0)}</strong>
              <span>{bucketLabel(compare[a]!.time, granularity)}</span>
            </div>
          )}
        </div>
      )}
      <span className="sr-only">{compare ? `Compared with ${compareName.toLowerCase()}.` : ""}</span>
    </div>
  );
}

export function ChartLegend({ metric, compareName }: { metric: Metric; compareName: string | null }) {
  return (
    <div className="legend" aria-hidden>
      <span>
        <span className="key" />
        {metricName[metric]}
      </span>
      {compareName && (
        <span>
          <span className="key key--compare" />
          {compareName}
        </span>
      )}
    </div>
  );
}

/** Accessible table view of the same series. */
export function ChartTable({ series, compare, metric, granularity }: Omit<Props, "height" | "nowKey" | "compareName">) {
  return (
    <div className="table-scroll">
      <table className="table table--compact">
        <caption className="sr-only">
          {metricName[metric]} by {granularity}
        </caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col" className="r">
              {metricName[metric]}
            </th>
            {compare && (
              <th scope="col" className="r">
                Comparison
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {series.map((p, i) => (
            <tr key={p.time}>
              <th scope="row" style={{ fontWeight: 400 }}>
                {bucketLabel(p.time, granularity)}
              </th>
              <td className="r">{number(p[metric])}</td>
              {compare && <td className="r">{compare[i] ? number(compare[i]![metric]) : "–"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
