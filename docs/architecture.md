# Architecture

```
 browser ──script.js──▶ POST /api/event ──▶ Collect (sanitise, classify, in memory)
                                              │
                                              ├─▶ Realtime ring buffer (30 min, memory)
                                              └─▶ Buffer: map[(site, hour, dims)] → {hits, arrivals}
                                                     │ every FLUSH_INTERVAL
                                                     ▼
                                     INSERT … ON CONFLICT DO UPDATE  (additive, via unnest)
                                                     ▼
                                               stats_hourly ◀── stats.Service ◀── dashboard API
```

## Why hourly aggregates instead of raw events

- **Privacy.** No row ever describes a single request. Individual journeys can't be reconstructed even with direct database access.
- **Cost.** Rows are keyed by `(site_id, hour, dims_key)`, where `dims_key` is a 64-bit hash of all the dimension values. A busy site produces at most one row per distinct dimension combination per hour, not one row per hit, so a cheap VPS handles a lot of traffic.
- **Flexibility.** Every dimension stays a real column, so any filter can be combined with any breakdown in plain SQL (`WHERE country = 'DE' GROUP BY path`).

The trade-off is that time resolution is hourly. Reporting time zones with 30- or 45-minute offsets shift by that amount. Live data (per minute, last 30 minutes) comes from the in-memory ring buffer instead.

## Ingestion

- `ingest.Collect` is pure and fully unit-tested. It turns `(payload, user agent, optional country header)` into a `Hit`, or into a typed rejection (bot, bad URL, unknown site, host mismatch, bad event).
- `ingest.Buffer` folds hits under a mutex and never does I/O on the request path. Flushes swap the map out and write it in chunks of 2,000 rows using `unnest()` arrays: one statement per chunk, additive on conflict.
- If a flush fails, the counters are merged back for the next attempt. The number of pending counters is capped (250k) so memory stays bounded when the database is down.
- Shutdown cancels the background context, which triggers a final flush.

## Query layer

`stats.Service` works on `stats_hourly`:

- **Totals and series.** `date_trunc(granularity, hour AT TIME ZONE site_tz)`, with buckets filled in Go so charts have no gaps. Week buckets start on Monday, matching PostgreSQL.
- **Breakdowns.** Top N for one dimension, ranked by that dimension's primary metric: pages by pageviews, sources and audience by visits, events by count.
- **Goals.** Each goal becomes one `FILTER (WHERE …)` column, so all goals are computed in a single query. Page patterns use `LIKE`, with `*` turned into `%` and the other characters escaped.
- **Export.** CSV is streamed row by row (daily × all dimensions), with formula-injection escaping.

Granularity follows the length of the range: 2 days or less is hourly, 93 days or less is daily, 400 days or less is weekly, and anything longer is monthly.

## HTTP

- The standard library `net/http` mux uses Go 1.22+ method and path patterns. There's no framework.
- Middleware runs in this order: recover → request log (no IPs, user agents or query strings; collection is only logged on 5xx) → security headers (strict CSP for the dashboard) → CSRF (`Sec-Fetch-Site` and `Origin` checks on state-changing dashboard calls).
- The collection endpoint has open CORS (`*`, no credentials) and accepts `text/plain` bodies, so `sendBeacon` needs no preflight.
- Auth uses one owner, bcrypt (cost 12) and 256-bit random session tokens. Only SHA-256 hashes of the tokens are stored. Cookies are `HttpOnly` and `SameSite=Lax`, plus `Secure` on HTTPS. Logins are rate-limited per client.
- First run: unless `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, the server logs a one-time **setup code**, and `/api/setup` requires it. This stops someone else from claiming a freshly deployed instance.

## Dashboard

- React 19, Vite, TanStack Query and a small History API router. URL search parameters hold the period, comparison, metric and filters, so every view can be shared and bookmarked.
- No component library and no CSS framework. `web/src/styles.css` is the whole design system (paper, ink, hairlines, one blue, Archivo in normal and condensed widths) and `web/src/ui.tsx` holds a dozen primitives built on native elements: `<dialog>`, `<select>`, checkboxes and date inputs.
- The visual language follows watch dials: the chart baseline carries a tick per bucket, the live view draws a 30-minute track, and the loading indicator is a sweeping hand. Reduced motion is respected.
- Charts are custom SVG with a single series in blue and the comparison as a dashed grey line, so identity never depends on colour alone. Each chart has a crosshair and tooltip, arrow-key navigation and a table view. While a query refreshes, the previous frame stays on screen at lower opacity instead of a loading flash.

## Deliberate limits

- **Single replica.** Live counters are per process. Running several replicas would undercount the live view; historical data would still be correct.
- **No raw events.** New dimensions only apply from the moment they are added. There is nothing to backfill from.
- **Coarse geography.** Country is estimated from the time zone, which is wrong for travellers and for zones shared by several countries. A trusted edge header can replace it.
