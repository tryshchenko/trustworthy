import { ExternalLink, ListFilter, Maximize2, Search } from "@orbit/icons";
import {
  Button,
  DataGrid,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  EmptyState,
  Input,
  Panel,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  type DataGridColumn,
} from "@orbit/ui";
import { useEffect, useState, type ReactNode } from "react";
import type { BreakdownRow, Metric, Site } from "../lib/api";
import { compact, number, percent, share } from "../lib/format";
import type { DashboardState, Filter } from "../lib/period";
import { useBreakdown } from "../lib/queries";
import { dimLabel, filterDim, valueIcon, valueLabel, type Dim } from "./dimensions";

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

/** A dashboard card with tabbed top-N lists for one family of dimensions. */
export function BreakdownCard({ site, state, title, tabs, onFilter, empty, footer }: CardProps) {
  const [dim, setDim] = useState<Dim>(tabs[0]!.dim);
  const [details, setDetails] = useState(false);
  const q = useBreakdown(site, state, dim);
  const data = q.data;
  const label = tabs.find((t) => t.dim === dim)?.label ?? dimLabel[dim];

  return (
    <Panel
      title={title}
      className="tw-card-min"
      bodyClassName="flex flex-1 flex-col"
      actions={
        tabs.length > 1 ? (
          <Tabs value={dim} onValueChange={(v) => setDim(v as Dim)}>
            <TabsList variant="pill" aria-label={`${title} breakdown`}>
              {tabs.map((t) => (
                <TabsTrigger key={t.dim} value={t.dim}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : undefined
      }
    >
      <div className={`flex flex-1 flex-col ${q.isPlaceholderData ? "tw-stale" : "tw-fresh"}`} aria-busy={q.isFetching}>
        {q.isPending ? (
          <div className="flex flex-col gap-3 pt-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} height={22} width={`${92 - i * 11}%`} />
            ))}
          </div>
        ) : q.isError ? (
          <EmptyState size="sm" title="Couldn't load this list" description={q.error.message} />
        ) : !data || data.rows.length === 0 ? (
          (empty ?? <EmptyState size="sm" title="Nothing yet" description={`No ${label.toLowerCase()} data for this period.`} />)
        ) : (
          <BarList rows={data.rows} dim={dim} metric={data.metric} total={data.total} label={label} onFilter={onFilter} filters={state.filters} />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <div className="min-w-0 text-xs text-fg-subtle">{footer}</div>
        {data && data.rows.length > 0 && (
          <Button size="sm" variant="ghost" leadingIcon={<Maximize2 size={14} />} onClick={() => setDetails(true)}>
            Details
          </Button>
        )}
      </div>
      <DetailsDrawer open={details} onOpenChange={setDetails} site={site} state={state} dim={dim} label={label} onFilter={onFilter} />
    </Panel>
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
      <div className="tw-list__head" aria-hidden>
        <span>{label}</span>
        <span>{metricHead[metric]}</span>
      </div>
      <ul className="tw-list" aria-label={`Top ${label.toLowerCase()} by ${metricHead[metric].toLowerCase()}`}>
        {rows.map((r) => {
          const v = r[metric];
          const name = valueLabel(dim, r.value);
          const pct = share(v, total);
          const inner = (
            <>
              <span className="tw-row__bar" style={{ width: `${Math.max(1.5, (v / max) * 100)}%` }} aria-hidden />
              <span className="tw-row__label" title={name}>
                {valueIcon(dim, r.value)}
                <span>{name}</span>
              </span>
              <span className="tw-row__value">
                {canFilter && <ListFilter size={13} className="tw-row__filter mr-2 inline align-[-2px]" aria-hidden />}
                {compact(v)}
              </span>
              <span className="tw-row__share">{percent(pct, 0)}</span>
            </>
          );
          return (
            <li key={r.value}>
              {canFilter ? (
                <button
                  type="button"
                  className="tw-row"
                  onClick={() => onFilter({ dim: fdim!, value: r.value })}
                  aria-label={`${name}: ${number(v)} ${metricHead[metric].toLowerCase()}, ${percent(pct, 0)}. Filter by this ${dimLabel[fdim!].toLowerCase()}.`}
                >
                  {inner}
                </button>
              ) : (
                <div className="tw-row">{inner}</div>
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

interface DrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  site: Site;
  state: DashboardState;
  dim: Dim;
  label: string;
  onFilter: (f: Filter) => void;
}

function DetailsDrawer({ open, onOpenChange, site, state, dim, label, onFilter }: DrawerProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const q = useBreakdown(site, state, dim, { limit: 500, search: debounced, enabled: open });
  const data = q.data;
  const fdim = filterDim(dim);
  const canFilter = fdim !== null && !state.filters.some((f) => f.dim === fdim);
  const isPage = dim === "page" || dim === "landing";

  const columns: DataGridColumn<BreakdownRow>[] = [
    {
      id: "value",
      header: label,
      isRowHeader: true,
      sortValue: (r) => valueLabel(dim, r.value),
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          {valueIcon(dim, r.value)}
          <span className="truncate" title={valueLabel(dim, r.value)}>
            {valueLabel(dim, r.value)}
          </span>
          {isPage && !r.value.includes(":id") && (
            <a
              href={`https://${site.domain}${r.value}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-fg-subtle hover:text-accent-fg"
              aria-label={`Open ${r.value} on ${site.domain}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </span>
      ),
    },
    ...(dim === "event"
      ? [{ id: "events", header: "Count", align: "end" as const, width: 110, sortValue: (r: BreakdownRow) => r.events, cell: (r: BreakdownRow) => number(r.events) }]
      : [
          { id: "visits", header: "Visits", align: "end" as const, width: 100, sortValue: (r: BreakdownRow) => r.visits, cell: (r: BreakdownRow) => number(r.visits) },
          { id: "pageviews", header: "Pageviews", align: "end" as const, width: 110, sortValue: (r: BreakdownRow) => r.pageviews, cell: (r: BreakdownRow) => number(r.pageviews) },
        ]),
    {
      id: "share",
      header: "Share",
      align: "end",
      width: 80,
      sortValue: (r) => r[data?.metric ?? "visits"],
      cell: (r) => <span className="text-fg-muted">{percent(share(r[data?.metric ?? "visits"], data?.total ?? 0))}</span>,
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg">
        <div className="flex h-full min-h-0 flex-col gap-4 p-5">
          <div>
            <DrawerTitle>{label}</DrawerTitle>
            <DrawerDescription>
              {data ? `${number(data.rows.length)}${data.rows.length >= 500 ? "+" : ""} values` : "Loading…"}
              {canFilter ? " · Select a row to filter the dashboard" : ""}
            </DrawerDescription>
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} leading={<Search size={16} />} aria-label={`Search ${label}`} />
          <div className={`min-h-0 flex-1 ${q.isFetching ? "tw-stale" : "tw-fresh"}`}>
            {data && (
              <DataGrid
                label={`${label} details`}
                columns={columns}
                rows={data.rows}
                getRowId={(r) => r.value}
                defaultSort={{ columnId: dim === "event" ? "events" : data.metric === "pageviews" ? "pageviews" : "visits", direction: "desc" }}
                height="100%"
                onRowActivate={
                  canFilter
                    ? (r) => {
                        onFilter({ dim: fdim!, value: r.value });
                        onOpenChange(false);
                      }
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
