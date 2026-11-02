import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { BreakdownRow, Metric, Site } from "../lib/api";
import { compact, number, percent, share } from "../lib/format";
import type { DashboardState, Filter } from "../lib/period";
import { useBreakdown } from "../lib/queries";
import { Button, Dialog, Empty, Icon, Skeleton, Tabs } from "../ui";
import { dimLabel, filterDim, valueLabel, valuePrefix, type Dim } from "./dimensions";

const metricHead: Record<Metric, string> = { pageviews: "Pageviews", visits: "Visits", events: "Count" };

export interface BreakdownTab {
  dim: Dim;
  label: string;
}

interface CardProps {
  site: Site;
  state: DashboardState;
  title: string;
  tabs: BreakdownTab[];
  onFilter: (f: Filter) => void;
  empty?: ReactNode;
  footer?: ReactNode;
}

/** A titled top-N list for one family of dimensions, with tabs for its variants. */
export function BreakdownCard({ site, state, title, tabs, onFilter, empty, footer }: CardProps) {
  const [dim, setDim] = useState<Dim>(tabs[0]!.dim);
  const [details, setDetails] = useState(false);
  const q = useBreakdown(site, state, dim);
  const data = q.data;
  const label = tabs.find((t) => t.dim === dim)?.label ?? dimLabel[dim];

  return (
    <section aria-label={title}>
      <header className="block__head">
        <h2 className="h3">{title}</h2>
        {tabs.length > 1 && <Tabs value={dim} onChange={setDim} label={`${title} breakdown`} items={tabs.map((t) => ({ value: t.dim, label: t.label }))} />}
      </header>
      <div className={q.isPlaceholderData ? "is-stale" : "is-fresh"} aria-busy={q.isFetching}>
        {q.isPending ? (
          <div className="stack" style={{ gap: 18, paddingTop: 12 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} height={14} width={`${90 - i * 11}%`} />
            ))}
          </div>
        ) : q.isError ? (
          <Empty title="Couldn't load this list">{q.error.message}</Empty>
        ) : !data || data.rows.length === 0 ? (
          (empty ?? <Empty title="Nothing yet">No {label.toLowerCase()} data for this period.</Empty>)
        ) : (
          <BarList rows={data.rows} dim={dim} metric={data.metric} total={data.total} label={label} onFilter={onFilter} filters={state.filters} />
        )}
      </div>
      <div className="block__foot">
        <span>{footer}</span>
        {data && data.rows.length > 0 && (
          <Button variant="quiet" size="sm" aria-label={`Show all ${title.toLowerCase()}`} onClick={() => setDetails(true)}>
            Show all <Icon name="arrow-right" />
          </Button>
        )}
      </div>
      <DetailsDialog open={details} onClose={() => setDetails(false)} site={site} state={state} dim={dim} label={label} onFilter={onFilter} />
    </section>
  );
}

interface BarListProps {
  rows: BreakdownRow[];
  dim: Dim;
  metric: Metric;
  total: number;
  label: string;
  filters: Filter[];
  onFilter: (f: Filter) => void;
}

export function BarList({ rows, dim, metric, total, label, filters, onFilter }: BarListProps) {
  const max = Math.max(1, ...rows.map((r) => r[metric]));
  const fdim = filterDim(dim);
  const canFilter = fdim !== null && !filters.some((f) => f.dim === fdim);
  return (
    <div>
      <div className="list-head" aria-hidden>
        <span className="label">{label}</span>
        <span className="label">{metricHead[metric]}</span>
      </div>
      <ul className="rows" aria-label={`Top ${label.toLowerCase()} by ${metricHead[metric].toLowerCase()}`}>
        {rows.map((r) => {
          const v = r[metric];
          const name = valueLabel(dim, r.value);
          const pct = share(v, total);
          const inner = (
            <>
              <span className="rowi__label" title={name}>
                {valuePrefix(dim, r.value)}
                <span>{name}</span>
              </span>
              <span className="rowi__value">
                {canFilter && <Icon name="filter" className="rowi__filter" />}
                {compact(v)}
              </span>
              <span className="rowi__share">{percent(pct, 0)}</span>
              <span className="rowi__bar" style={{ width: `${Math.max(0.75, (v / max) * 100)}%` }} aria-hidden />
            </>
          );
          return (
            <li key={r.value}>
              {canFilter ? (
                <button
                  type="button"
                  className="rowi"
                  onClick={() => onFilter({ dim: fdim!, value: r.value })}
                  aria-label={`${name}: ${number(v)} ${metricHead[metric].toLowerCase()}, ${percent(pct, 0)}. Filter by this ${dimLabel[fdim!].toLowerCase()}.`}
                >
                  {inner}
                </button>
              ) : (
                <div className="rowi">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

type SortKey = "value" | "visits" | "pageviews" | "events";

function DetailsDialog({
  open,
  onClose,
  site,
  state,
  dim,
  label,
  onFilter,
}: {
  open: boolean;
  onClose: () => void;
  site: Site;
  state: DashboardState;
  dim: Dim;
  label: string;
  onFilter: (f: Filter) => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const q = useBreakdown(site, state, dim, { limit: 500, search: debounced, enabled: open });
  const data = q.data;
  const fdim = filterDim(dim);
  const canFilter = fdim !== null && !state.filters.some((f) => f.dim === fdim);
  const isPage = dim === "page" || dim === "landing";
  const cols: Metric[] = dim === "event" ? ["events"] : ["visits", "pageviews"];
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: cols[0]!, desc: true });

  const rows = useMemo(() => {
    const out = [...(data?.rows ?? [])];
    const k = sort.key;
    out.sort((a, b) => {
      const d = k === "value" ? valueLabel(dim, a.value).localeCompare(valueLabel(dim, b.value)) : a[k] - b[k];
      return sort.desc ? -d : d;
    });
    return out;
  }, [data, sort, dim]);

  const head = (k: SortKey, text: string, right = false) => (
    <th scope="col" className={right ? "r" : undefined} aria-sort={sort.key === k ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" aria-pressed={sort.key === k} onClick={() => setSort((s) => ({ key: k, desc: s.key === k ? !s.desc : k !== "value" }))}>
        {text}
        {sort.key === k && <Icon name="chevron-down" className={sort.desc ? undefined : "flip"} />}
      </button>
    </th>
  );
  const metric = data?.metric ?? "visits";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={label}
      description={
        <>
          {data ? `${number(data.rows.length)}${data.rows.length >= 500 ? "+" : ""} values` : "Loading…"}
          {canFilter ? " · Select a row to filter the dashboard" : ""}
        </>
      }
    >
      <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label}`} />
      <div className={q.isFetching ? "is-stale" : "is-fresh"} style={{ maxHeight: "55vh", overflow: "auto" }}>
        <table className="table table--compact">
          <thead>
            <tr>
              {head("value", label)}
              {cols.map((c) => head(c, c === "events" ? "Count" : metricHead[c], true))}
              <th scope="col" className="r">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.value}
                data-clickable={canFilter || undefined}
                onClick={
                  canFilter
                    ? () => {
                        onFilter({ dim: fdim!, value: r.value });
                        onClose();
                      }
                    : undefined
                }
              >
                <th scope="row">
                  <span className="rowi__label">
                    {valuePrefix(dim, r.value)}
                    {canFilter ? (
                      <button
                        type="button"
                        className="link"
                        style={{ border: 0, background: "none", padding: 0, color: "inherit", fontWeight: 500, textAlign: "left" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilter({ dim: fdim!, value: r.value });
                          onClose();
                        }}
                      >
                        {valueLabel(dim, r.value)}
                      </button>
                    ) : (
                      <span>{valueLabel(dim, r.value)}</span>
                    )}
                    {isPage && !r.value.includes(":id") && (
                      <a
                        href={`https://${site.domain}${r.value}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="muted"
                        aria-label={`Open ${r.value} on ${site.domain}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon name="arrow-up-right" />
                      </a>
                    )}
                  </span>
                </th>
                {cols.map((c) => (
                  <td key={c} className="r">
                    {number(r[c])}
                  </td>
                ))}
                <td className="r muted">{percent(share(r[metric], data?.total ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && rows.length === 0 && <Empty title="No matches">Try a shorter search.</Empty>}
      </div>
    </Dialog>
  );
}
