import { useEffect, useMemo, useRef, useState } from "react";
import { BreakdownCard } from "../components/Breakdown";
import { dimLabel, valueLabel, type Dim } from "../components/dimensions";
import { MetricTiles } from "../components/MetricTiles";
import { CompareSelect, PeriodPicker } from "../components/PeriodPicker";
import { ChartLegend, ChartTable, TrafficChart, metricName } from "../components/TrafficChart";
import type { Metric, Site } from "../lib/api";
import { apiQuery, compareLabel, readState, todayIn, type Filter, type PeriodId } from "../lib/period";
import { useOverview } from "../lib/queries";
import { Link, useLocation, useSearchUpdate } from "../lib/router";
import { Button, ButtonLink, Empty, Icon, Skeleton, toast } from "../ui";

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

export function useDashboardState(site: Site) {
  const { search } = useLocation();
  const update = useSearchUpdate();
  const state = useMemo(() => readState(search, site.timezone), [search, site.timezone]);
  const today = todayIn(site.timezone);

  const setPeriod = (p: { period: PeriodId; from?: string; to?: string }) =>
    update(
      (q) => {
        q.set("period", p.period);
        if (p.period === "custom" && p.from && p.to) {
          q.set("from", p.from);
          q.set("to", p.to);
        } else {
          q.delete("from");
          q.delete("to");
        }
      },
      { push: true },
    );
  const setCompare = (c: string) => update((q) => (c === "previous" ? q.delete("compare") : q.set("compare", c)));
  const addFilter = (f: Filter) =>
    update(
      (q) => {
        q.getAll("filter").forEach((v) => v.startsWith(`${f.dim}:`) && q.delete("filter", v));
        q.append("filter", `${f.dim}:${f.value}`);
      },
      { push: true },
    );
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
    const io = new IntersectionObserver(([e]) => setStuck(!e!.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, stuck] as const;
}

export function Toolbar({ dash, actions }: { dash: ReturnType<typeof useDashboardState>; actions?: React.ReactNode }) {
  const { state, today, setPeriod, setCompare, removeFilter, clearFilters } = dash;
  const [sentinel, stuck] = useStuck();
  return (
    <>
      <div ref={sentinel} aria-hidden style={{ height: 1, marginBottom: -1 }} />
      <div className="toolbar" data-stuck={stuck || undefined} role="toolbar" aria-label="Date range and filters">
        <PeriodPicker state={state} today={today} onChange={setPeriod} />
        <CompareSelect value={state.compare} onChange={setCompare} />
        {state.filters.map((f) => (
          <span key={`${f.dim}:${f.value}`} className="chip">
            <span className="label">{dimLabel[f.dim as Dim] ?? f.dim}</span>
            {valueLabel(f.dim, f.value)}
            <button type="button" onClick={() => removeFilter(f)} aria-label={`Remove filter ${dimLabel[f.dim as Dim] ?? f.dim}`}>
              <Icon name="x" />
            </button>
          </span>
        ))}
        {state.filters.length > 1 && (
          <Button variant="quiet" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
        <span className="spacer" />
        {actions}
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
    <>
      <Toolbar
        dash={dash}
        actions={
          <ButtonLink href={exportHref} download variant="quiet" title="Daily aggregates for this range, as CSV" onClick={() => toast("Preparing CSV export")}>
            <Icon name="download" /> Export CSV
          </ButtonLink>
        }
      />

      {neverSeen && (
        <div className="notice">
          <div>
            <p className="h3">Waiting for the first pageview</p>
            <p>Add the tracking snippet to {site.domain}. Numbers appear here within seconds of the first visit.</p>
          </div>
          <ButtonLink href={`/sites/${site.id}/install`} variant="rule">
            Install tracking code <Icon name="arrow-right" />
          </ButtonLink>
        </div>
      )}

      <div className={overview.isPlaceholderData ? "is-stale" : "is-fresh"}>
        <MetricTiles totals={data?.totals} compare={data?.compareTotals} compareLabel={cmpLabel} metric={metric} onMetric={setMetric} />
      </div>

      <section className="block" aria-label={`${metricName[metric]} over time`}>
        <header className="block__head">
          <h2 className="h3">{metricName[metric]} over time</h2>
          <div className="block__actions">
            <ChartLegend metric={metric} compareName={cmpName} />
            <Button variant="quiet" size="sm" aria-pressed={asTable} onClick={() => setAsTable((t) => !t)}>
              <Icon name={asTable ? "chart" : "table"} /> {asTable ? "Chart" : "Table"}
            </Button>
          </div>
          {data && (
            <p>
              By {data.range.granularity} · {site.timezone.replace(/_/g, " ")}
            </p>
          )}
        </header>
        <div className={overview.isPlaceholderData ? "is-stale" : "is-fresh"}>
          {overview.isPending ? (
            <Skeleton height={300} />
          ) : overview.isError ? (
            <Empty title="Couldn't load traffic" action={<Button onClick={() => void overview.refetch()}>Retry</Button>}>
              {overview.error.message}
            </Empty>
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
        </div>
      </section>

      <div className="grid-2 section-gap">
        <BreakdownCard
          site={site}
          state={state}
          title="Sources"
          onFilter={addFilter}
          tabs={[
            { dim: "channel", label: "Channels" },
            { dim: "referrer", label: "Referrers" },
          ]}
          footer="Attributed to the first page of a visit."
        />
        <BreakdownCard
          site={site}
          state={state}
          title="Pages"
          onFilter={addFilter}
          tabs={[
            { dim: "page", label: "Top" },
            { dim: "landing", label: "Landing" },
          ]}
        />
        <BreakdownCard
          site={site}
          state={state}
          title="Countries"
          onFilter={addFilter}
          tabs={[{ dim: "country", label: "Countries" }]}
          footer="Estimated from the visitor's time zone. No IP lookup."
        />
        <BreakdownCard
          site={site}
          state={state}
          title="Technology"
          onFilter={addFilter}
          tabs={[
            { dim: "device", label: "Device" },
            { dim: "browser", label: "Browser" },
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
            <Empty title="No campaign traffic">
              Tag links with <span className="code-inline">?utm_source=newsletter</span> to see them here.
            </Empty>
          }
        />
        <BreakdownCard
          site={site}
          state={state}
          title="Events"
          onFilter={addFilter}
          tabs={[{ dim: "event", label: "Events" }]}
          empty={
            <Empty
              title="No events yet"
              action={
                <Link className="link" href={`/sites/${site.id}/install#events`}>
                  How to send events →
                </Link>
              }
            >
              Track sign-ups, downloads and other actions with one attribute.
            </Empty>
          }
          footer={
            <Link className="link" href={`/sites/${site.id}/goals`}>
              Turn events into goals →
            </Link>
          }
        />
      </div>
    </>
  );
}
