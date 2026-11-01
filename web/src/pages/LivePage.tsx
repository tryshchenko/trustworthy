import { Info } from "@orbit/icons";
import { EmptyState, Panel, Skeleton } from "@orbit/ui";
import { useState } from "react";
import { BarList } from "../components/Breakdown";
import type { Realtime, Site } from "../lib/api";
import { compact, number } from "../lib/format";
import { useRealtime } from "../lib/queries";
import { navigate } from "../lib/router";
import { SiteHeader } from "./OverviewPage";

function MinuteBars({ minutes }: { minutes: Realtime["minutes"] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...minutes.map((m) => m.pageviews));
  const H = 160;
  const n = minutes.length;
  const ago = (i: number) => n - 1 - i;
  const a = active != null ? minutes[active] : undefined;
  return (
    <div className="relative">
      <div
        className="grid items-end gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, height: H }}
        role="list"
        aria-label="Pageviews per minute, last 30 minutes"
        onPointerLeave={() => setActive(null)}
      >
        {minutes.map((m, i) => {
          const h = m.pageviews ? Math.max(4, (m.pageviews / max) * H) : 2;
          return (
            <div
              key={m.time}
              role="listitem"
              tabIndex={0}
              aria-label={`${ago(i) === 0 ? "This minute" : `${ago(i)} minutes ago`}: ${m.pageviews} pageviews`}
              className="group flex h-full items-end justify-center focus-visible:outline-none"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <div
                className="w-full max-w-[24px] transition-[height,filter] duration-300 group-focus-visible:ring-2 group-focus-visible:ring-[var(--orb-color-border-focus)]"
                style={{
                  height: h,
                  borderRadius: "4px 4px 0 0",
                  background: m.pageviews ? "var(--tw-series-pageviews)" : "var(--orb-color-border-subtle)",
                  filter: active === i ? "brightness(1.15)" : undefined,
                  opacity: active != null && active !== i ? 0.55 : 1,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-fg-subtle tabular" aria-hidden>
        <span>30 min ago</span>
        <span>15 min ago</span>
        <span>Now</span>
      </div>
      {a && active != null && (
        <div
          className="tw-tooltip"
          style={{ transform: `translate(clamp(0px, calc(${(active / n) * 100}% - 80px), calc(100% - 180px)), -8px)`, left: 0, width: 168 }}
        >
          <div className="tw-tooltip__title">{ago(active) === 0 ? "This minute" : `${ago(active)} min ago`}</div>
          <div className="tw-tooltip__row">
            <span className="tw-linekey" style={{ ["--tw-key" as string]: "var(--tw-series-pageviews)" }} />
            <strong>{number(a.pageviews)}</strong>
            <span>Pageviews</span>
          </div>
          <div className="tw-tooltip__row">
            <span className="tw-linekey" style={{ ["--tw-key" as string]: "var(--tw-series-visits)" }} />
            <strong>{number(a.visits)}</strong>
            <span>Visits</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LivePage({ site }: { site: Site }) {
  const rt = useRealtime(site.id, 5_000);
  const d = rt.data;
  const toOverview = (dim: string, value: string) =>
    navigate(`/sites/${site.id}?period=today&filter=${encodeURIComponent(`${dim}:${value}`)}`);

  return (
    <div className="tw-page">
      <SiteHeader site={site} title={`Live · ${site.name}`} />

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <span className="tw-live-dot" data-idle={d && d.pageviews === 0 ? "" : undefined} aria-hidden /> Last 30 minutes
          </span>
        }
        description="Updates every few seconds"
      >
        {!d ? (
          <Skeleton height={220} radius="md" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <div>
                <div className="font-semibold tracking-tight" style={{ fontSize: 56, lineHeight: 1 }} aria-live="polite">
                  {compact(d.pageviews)}
                </div>
                <div className="mt-1.5 text-sm text-fg-muted">pageviews in the last 30 minutes</div>
              </div>
              <dl className="m-0 grid grid-cols-3 gap-3 lg:grid-cols-1">
                {[
                  ["Last 5 minutes", d.pageviewsLast5, "pageviews"],
                  ["Visits", d.visits, "arrivals from outside"],
                  ["Events", d.events, "custom events"],
                ].map(([label, value, hint]) => (
                  <div key={label as string} className="rounded-lg border border-line bg-sunken px-3 py-2">
                    <dt className="text-xs font-medium text-fg-muted">{label}</dt>
                    <dd className="m-0 text-xl font-semibold tabular">{compact(value as number)}</dd>
                    <dd className="m-0 text-xs text-fg-subtle max-lg:hidden">{hint}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <MinuteBars minutes={d.minutes} />
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pages right now">
          {d && d.topPages.length > 0 ? (
            <BarList
              rows={d.topPages.map((p) => ({ value: p.label, pageviews: p.count, visits: 0, events: 0 }))}
              dim="page"
              metric="pageviews"
              total={d.pageviews}
              label="Page"
              filters={[]}
              onFilter={(f) => toOverview(f.dim, f.value)}
            />
          ) : (
            <EmptyState size="sm" title="Quiet right now" description="Pages appear here as soon as someone visits." />
          )}
        </Panel>
        <Panel title="Arriving from">
          {d && d.topSources.length > 0 ? (
            <BarList
              rows={d.topSources.map((p) => ({ value: p.label, pageviews: 0, visits: p.count, events: 0 }))}
              dim="referrer"
              metric="visits"
              total={d.visits}
              label="Source"
              filters={[]}
              onFilter={(f) => toOverview(/\./.test(f.value) ? "referrer" : "channel", f.value)}
            />
          ) : (
            <EmptyState size="sm" title="No new arrivals" description="Referrers and channels of new visits show up here." />
          )}
        </Panel>
      </div>

      <p className="m-0 flex items-start gap-2 px-1 text-sm text-fg-muted">
        <Info size={16} className="mt-0.5 flex-none" aria-hidden />
        Live figures count activity, not people online — counting people would require tracking them. They are held in memory for 30 minutes
        only and reset when the server restarts.
      </p>
    </div>
  );
}
