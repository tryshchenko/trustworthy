import { ArrowRight, Download, ExternalLink, LineChart, Sparkles, Table2, X } from "@orbit/icons";
import { AeroButton, Button, EmptyState, IconButton, Panel, Skeleton, Tag, Tooltip, toast } from "@orbit/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { BreakdownCard } from "../components/Breakdown";
import { dimLabel, valueLabel, type Dim } from "../components/dimensions";
import { MetricTiles } from "../components/MetricTiles";
import { PeriodPicker, CompareSelect } from "../components/PeriodPicker";
import { ChartLegend, ChartTable, TrafficChart, metricName } from "../components/TrafficChart";
import { siteKey } from "../components/Shell";
import type { Metric, Site } from "../lib/api";
import { timeAgo } from "../lib/format";
import { apiQuery, compareLabel, readState, todayIn, type Filter, type PeriodId } from "../lib/period";
import { useOverview } from "../lib/queries";
import { Link, useLocation, useSearchUpdate } from "../lib/router";

/** Current local wall-clock time in a zone as "YYYY-MM-DDTHH:mm". */
export function nowKeyIn(timeZone: string): string {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

export function SiteHeader({ site, title, actions }: { site: Site; title?: string; actions?: React.ReactNode }) {
  const live = site.lastHitAt && Date.now() - new Date(site.lastHitAt).getTime() < 5 * 60_000;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-1 pt-1">
      <div className="flex min-w-0 items-center gap-3">
        <span className="orb-project-icon" style={{ width: 44, height: 44, fontSize: 15, ["--orb-project-color" as string]: site.color }} aria-hidden>
          {siteKey(site)}
        </span>
        <div className="min-w-0">
          <h1 className="orb-type-page-title m-0 truncate">{title ?? site.name}</h1>
          <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-fg-muted">
            <a href={`https://${site.domain}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 hover:text-accent-fg hover:underline">
              {site.domain}
              <ExternalLink size={12} aria-hidden />
            </a>
            {site.lastHitAt && (
              <span className="inline-flex items-center gap-1.5">
                <span className="tw-live-dot" data-idle={live ? undefined : ""} aria-hidden />
                Last activity {timeAgo(site.lastHitAt)}
              </span>
            )}
          </p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function useDashboardState(site: Site) {
  const { search } = useLocation();
  const update = useSearchUpdate();
  const state = useMemo(() => readState(search, site.timezone), [search, site.timezone]);
  const today = todayIn(site.timezone);

  const setPeriod = (p: { period: PeriodId; from?: string; to?: string }) =>
    update((q) => {
      q.set("period", p.period);
      if (p.period === "custom" && p.from && p.to) {
        q.set("from", p.from);
        q.set("to", p.to);
      } else {
        q.delete("from");
        q.delete("to");
      }
    }, { push: true });
  const setCompare = (c: string) => update((q) => (c === "previous" ? q.delete("compare") : q.set("compare", c)));
  const addFilter = (f: Filter) =>
    update((q) => {
      q.getAll("filter").forEach((v) => v.startsWith(`${f.dim}:`) && q.delete("filter", v));
      q.append("filter", `${f.dim}:${f.value}`);
    }, { push: true });
  const removeFilter = (f: Filter) => update((q) => q.delete("filter", `${f.dim}:${f.value}`), { push: true });
  const clearFilters = () => update((q) => q.delete("filter"), { push: true });
  return { state, today, search, update, setPeriod, setCompare, addFilter, removeFilter, clearFilters };
}

/** Tracks whether a sticky element is currently stuck, via a zero-height sentinel above it. */
function useStuck() {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.getElementById("orb-main");
    const io = new IntersectionObserver(([e]) => setStuck(!e!.isIntersecting), { root, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, stuck] as const;
}

export function Toolbar({ dash }: { dash: ReturnType<typeof useDashboardState> }) {
  const { state, today, setPeriod, setCompare, removeFilter, clearFilters } = dash;
  const [sentinel, stuck] = useStuck();
  return (
    <>
    <div ref={sentinel} aria-hidden className="-mb-4 h-0" />
    <div className="tw-toolbar flex flex-wrap items-center gap-2" data-stuck={stuck || undefined} role="toolbar" aria-label="Date range and filters">
      <PeriodPicker state={state} today={today} onChange={setPeriod} />
      <CompareSelect value={state.compare} onChange={setCompare} />
      {state.filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {state.filters.map((f) => (
            <Tag key={`${f.dim}:${f.value}`} color="info" onRemove={() => removeFilter(f)} removeLabel={`Remove filter ${dimLabel[f.dim as Dim] ?? f.dim}`}>
              <span className="text-fg-muted">{dimLabel[f.dim as Dim] ?? f.dim} is</span>&nbsp;<b className="font-medium">{valueLabel(f.dim, f.value)}</b>
            </Tag>
          ))}
          {state.filters.length > 1 && (
            <Button size="sm" variant="ghost" leadingIcon={<X size={14} />} onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
    </>
  );
}

export function OverviewPage({ site }: { site: Site }) {
  const dash = useDashboardState(site);
  const { state, search, update, addFilter } = dash;
  const overview = useOverview(site, state);
  const [asTable, setAsTable] = useState(false);
  const metric = (["pageviews", "visits", "events"].includes(search.get("metric") ?? "") ? search.get("metric") : "visits") as Metric;
  const setMetric = (m: Metric) => update((q) => (m === "visits" ? q.delete("metric") : q.set("metric", m)));

  const data = overview.data;
  const cmpLabel = compareLabel(state.compare);
  const cmpName = state.compare === "none" ? null : state.compare === "year" ? "Same period last year" : "Previous period";
  const exportHref = `/api/sites/${site.id}/export?${apiQuery({ ...state, compare: "none" })}`;
  const neverSeen = !site.firstHitAt && !site.lastHitAt;

  return (
    <div className="tw-page">
      <SiteHeader
        site={site}
        actions={
          <Tooltip content="Download daily aggregates for this range as CSV">
            <Button asChild variant="secondary" leadingIcon={<Download size={15} />}>
              <a href={exportHref} download onClick={() => toast({ title: "Preparing your CSV export", tone: "info", duration: 2500 })}>
                Export
              </a>
            </Button>
          </Tooltip>
        }
      />

      <Toolbar dash={dash} />

      {neverSeen && (
        <div
          className="flex flex-wrap items-center gap-4 rounded-xl border p-4"
          style={{ borderColor: "var(--orb-color-surface-selected-border)", background: "linear-gradient(100deg, #E3F2FE, #E6FAF6)" }}
        >
          <span className="tw-step" aria-hidden>
            <Sparkles size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 font-semibold">Waiting for the first pageview</p>
            <p className="m-0 text-sm text-fg-muted">Add the tracking snippet to {site.domain}. Stats appear here within seconds of the first visit.</p>
          </div>
          <AeroButton asChild trailingIcon={<ArrowRight size={16} />}>
            <Link href={`/sites/${site.id}/install`}>Install tracking code</Link>
          </AeroButton>
        </div>
      )}

      <div className={overview.isPlaceholderData ? "tw-stale" : "tw-fresh"}>
        <MetricTiles totals={data?.totals} compare={data?.compareTotals} compareLabel={cmpLabel} metric={metric} onMetric={setMetric} />
      </div>

      <Panel
        title={`${metricName[metric]} over time`}
        description={data ? `By ${data.range.granularity} · ${site.timezone.replace(/_/g, " ")}` : undefined}
        actions={
          <div className="flex items-center gap-3">
            <span className="max-sm:hidden">
              <ChartLegend metric={metric} compareName={cmpName} />
            </span>
            <IconButton
              label={asTable ? "Show as chart" : "Show as table"}
              icon={asTable ? <LineChart size={16} /> : <Table2 size={16} />}
              variant="ghost"
              size="sm"
              aria-pressed={asTable}
              onClick={() => setAsTable((t) => !t)}
            />
          </div>
        }
      >
        <div className={overview.isPlaceholderData ? "tw-stale" : "tw-fresh"}>
          {overview.isPending ? (
            <Skeleton height={280} radius="md" />
          ) : overview.isError ? (
            <EmptyState title="Couldn't load traffic" description={overview.error.message} actions={<Button onClick={() => void overview.refetch()}>Retry</Button>} />
          ) : data && asTable ? (
            <ChartTable series={data.series} compare={data.compareSeries} metric={metric} granularity={data.range.granularity} />
          ) : data ? (
            <TrafficChart
              series={data.series}
              compare={data.compareSeries}
              metric={metric}
              granularity={data.range.granularity}
              nowKey={nowKeyIn(site.timezone)}
              partialLast={data.range.to >= dash.today}
              compareName={cmpName ?? undefined}
            />
          ) : null}
          <div className="mt-2 sm:hidden">
            <ChartLegend metric={metric} compareName={cmpName} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          site={site}
          state={state}
          title="Sources"
          onFilter={addFilter}
          tabs={[
            { dim: "channel", label: "Channels" },
            { dim: "referrer", label: "Referrers" },
          ]}
          footer="Attributed to the visit's first page only."
        />
        <BreakdownCard
          site={site}
          state={state}
          title="Pages"
          onFilter={addFilter}
          tabs={[
            { dim: "page", label: "Top pages" },
            { dim: "landing", label: "Landing pages" },
          ]}
        />
        <BreakdownCard site={site} state={state} title="Countries" onFilter={addFilter} tabs={[{ dim: "country", label: "Countries" }]} footer="Estimated from the visitor's time zone — no IP lookup." />
        <BreakdownCard
          site={site}
          state={state}
          title="Technology"
          onFilter={addFilter}
          tabs={[
            { dim: "device", label: "Devices" },
            { dim: "browser", label: "Browsers" },
            { dim: "os", label: "OS" },
          ]}
        />
        <BreakdownCard
          site={site}
          state={state}
          title="Campaigns"
          onFilter={addFilter}
          tabs={[
            { dim: "utm_source", label: "Source" },
            { dim: "utm_medium", label: "Medium" },
            { dim: "utm_campaign", label: "Campaign" },
          ]}
          empty={
            <EmptyState
              size="sm"
              title="No campaign traffic"
              description={
                <>
                  Tag links with <span className="tw-inline-code">?utm_source=newsletter</span> to see them here.
                </>
              }
            />
          }
        />
        <BreakdownCard
          site={site}
          state={state}
          title="Custom events"
          onFilter={addFilter}
          tabs={[{ dim: "event", label: "Events" }]}
          empty={
            <EmptyState
              size="sm"
              title="No events yet"
              description="Track sign-ups, downloads and other actions with one attribute."
              actions={
                <Button size="sm" asChild>
                  <Link href={`/sites/${site.id}/install#events`}>How to send events</Link>
                </Button>
              }
            />
          }
          footer={
            <Link href={`/sites/${site.id}/goals`} className="text-accent-fg hover:underline">
              Turn events into goals →
            </Link>
          }
        />
      </div>
    </div>
  );
}
