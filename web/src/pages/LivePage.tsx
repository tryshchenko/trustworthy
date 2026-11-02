import { useState } from "react";
import { BarList } from "../components/Breakdown";
import type { Realtime, Site } from "../lib/api";
import { compact, number } from "../lib/format";
import { useRealtime } from "../lib/queries";
import { navigate } from "../lib/router";
import { Empty, Skeleton } from "../ui";

/** Thirty bars on a baseline — the minute track of a dial. The current minute is blue. */
function MinuteTrack({ minutes }: { minutes: Realtime["minutes"] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...minutes.map((m) => m.pageviews));
  const n = minutes.length;
  const ago = (i: number) => n - 1 - i;
  const a = active != null ? minutes[active] : undefined;
  return (
    <div className="track">
      <div
        className="track__bars"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        role="list"
        aria-label="Pageviews per minute, last 30 minutes"
        onPointerLeave={() => setActive(null)}
      >
        {minutes.map((m, i) => (
          <div
            key={m.time}
            role="listitem"
            tabIndex={0}
            className="track__bar"
            data-now={ago(i) === 0 || undefined}
            data-zero={m.pageviews === 0 || undefined}
            aria-label={`${ago(i) === 0 ? "This minute" : `${ago(i)} minutes ago`}: ${m.pageviews} pageviews`}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span style={{ height: `${(m.pageviews / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="track__scale label" aria-hidden>
        <span>−30 min</span>
        <span>−15</span>
        <span>Now</span>
      </div>
      {a && active != null && (
        <div className="tooltip" style={{ left: `clamp(0px, calc(${((active + 0.5) / n) * 100}% - 85px), calc(100% - 170px))` }}>
          <div className="tooltip__title label">{ago(active) === 0 ? "This minute" : `${ago(active)} min ago`}</div>
          <div className="tooltip__row">
            <strong>{number(a.pageviews)}</strong>
            <span>pageviews</span>
          </div>
          <div className="tooltip__row">
            <strong>{number(a.visits)}</strong>
            <span>visits</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LivePage({ site }: { site: Site }) {
  const rt = useRealtime(site.id, 5_000);
  const d = rt.data;
  const toOverview = (dim: string, value: string) => navigate(`/sites/${site.id}?period=today&filter=${encodeURIComponent(`${dim}:${value}`)}`);

  return (
    <>
      <section className="live-hero" aria-label="Last 30 minutes">
        <div>
          <p className="eyebrow live" style={{ marginBottom: "1.25rem" }}>
            <span className="live__dot" data-idle={d && d.pageviews === 0 ? "" : undefined} aria-hidden />
            Last 30 minutes
          </p>
          {d ? (
            <>
              <p className="live-number" aria-live="polite">
                {compact(d.pageviews)}
              </p>
              <p className="muted" style={{ marginTop: "0.75rem" }}>
                pageviews · updates every 5 seconds
              </p>
              <dl className="live-stats">
                {(
                  [
                    ["Last 5 min", d.pageviewsLast5],
                    ["Visits", d.visits],
                    ["Events", d.events],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="label">{label}</dt>
                    <dd>{compact(value)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <Skeleton height={120} width="70%" />
          )}
        </div>
        {d ? <MinuteTrack minutes={d.minutes} /> : <Skeleton height={220} />}
      </section>

      <div className="grid-2">
        <section aria-label="Pages right now">
          <header className="block__head">
            <h2 className="h3">Pages right now</h2>
          </header>
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
            <Empty title="Quiet right now">Pages appear here as soon as someone visits.</Empty>
          )}
        </section>
        <section aria-label="Arriving from">
          <header className="block__head">
            <h2 className="h3">Arriving from</h2>
          </header>
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
            <Empty title="No new arrivals">Referrers and channels of new visits show up here.</Empty>
          )}
        </section>
      </div>

      <p className="small muted" style={{ maxWidth: "44rem", marginTop: "1.5rem" }}>
        Live figures count activity, not people online — counting people would require tracking them. They are held in memory for 30 minutes and reset when
        the server restarts.
      </p>
    </>
  );
}
