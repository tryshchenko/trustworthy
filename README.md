<div align="center">

<img src="web/public/favicon.svg" width="72" height="72" alt="" />

# Trustworthy

**Privacy-first, self-hosted web analytics.**<br/>
It sets no cookies, stores nothing on visitors' devices and creates no identifiers. The dashboard is still one you'll want to open.

[Quick start](#quick-start) · [Deploy on Coolify](#deploy-on-coolify) · [Add to your site](#add-it-to-your-site) · [Privacy model](docs/privacy.md) · [Architecture](docs/architecture.md)

<br/>

<img src="docs/screenshots/overview.png" alt="Trustworthy dashboard: visits, pageviews, views per visit and events over 90 days, compared with the previous period" width="100%" />

</div>

---

## Why Trustworthy

Most analytics tools follow people around. Trustworthy measures **pages, not people**.

- 🍪 **No cookies, no device storage.** It never touches `localStorage`, `sessionStorage` or IndexedDB, and doesn't fingerprint.
- 🫥 **No identifiers.** Each request stands alone. Nothing links two pageviews to each other, or to a person.
- 🧮 **Aggregates only.** Hits are folded into hourly counters in memory. Individual requests are never written to disk.
- 🧹 **Cleaned twice.** The browser strips query strings and fragments, and the server redacts e-mail addresses, IDs and tokens from paths and campaign tags.
- 🏠 **Self-hosted and independent.** You get one ~14 MB binary and PostgreSQL. Nothing calls home: no telemetry, CDNs or third-party services.
- ✨ **A dashboard worth opening.** It's built on the Aero Scenic theme of the [Orbit UI](third_party/orbit-ui/FORK.md) design system: frosted-glass chrome, a calm content window and readable charts.

> Trustworthy is designed so that most sites can measure traffic without a consent banner. **Compliance is never automatic**, though. Read the [privacy model and legal assumptions](docs/privacy.md) before you rely on that.

## A quick tour

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/breakdowns.png" alt="Sources, pages, countries and technology breakdowns" /></td>
    <td width="50%"><img src="docs/screenshots/filtered.png" alt="Dashboard filtered to visitors from Germany over the last 7 days" /></td>
  </tr>
  <tr>
    <td><b>Breakdowns.</b> Channels, referrers, campaigns, pages, landing pages, countries, devices, browsers and OS. Click any row to filter the whole dashboard.</td>
    <td><b>Filters and comparisons.</b> Any period against the previous period or the previous year. Filters stack, and every view lives in a shareable URL.</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/live.png" alt="Live view: pageviews per minute over the last 30 minutes" /></td>
    <td><img src="docs/screenshots/goals.png" alt="Conversion goals with completions, conversion rate and change" /></td>
  </tr>
  <tr>
    <td><b>Live.</b> Minute-by-minute activity for the last 30 minutes, with the pages and sources in use right now.</td>
    <td><b>Goals and events.</b> Count sign-ups, downloads or visits to <code>/thank-you</code> or <code>/blog/*</code>, with conversion rates and trends.</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/install.png" alt="Tracking code page with snippet, options and live installation check" /></td>
    <td><img src="docs/screenshots/privacy.png" alt="Privacy and data page listing exactly what is collected" /></td>
  </tr>
  <tr>
    <td><b>One-minute setup.</b> Copy the snippet, toggle options, and watch the installation check turn green as the first pageview arrives.</td>
    <td><b>Radical transparency.</b> A built-in page lists exactly what is stored and what never is, with privacy-notice text you can paste into your own policy.</td>
  </tr>
</table>

<p align="center">
  <img src="docs/screenshots/mobile.png" alt="Dashboard on a phone" width="260" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/login.png" alt="Sign-in screen over the Aero Scenic background" width="540" />
</p>

## Features

| | |
| --- | --- |
| **Traffic** | Pageviews, visits, views per visit and custom events. Charts switch between hour, day, week and month automatically, and the current bucket is marked as still in progress. |
| **Acquisition** | Channels (search, social, email, paid, referral, campaign, direct), referrer hosts, and UTM source, medium and campaign. |
| **Audience** | Country (estimated from the time zone, with no IP lookup), device class, browser and OS. |
| **Goals** | Event goals and page goals with `*` wildcards. Shows completions, conversion rate and change. |
| **Live** | Per-minute activity for the last 30 minutes. A header pill shows the count for the last 5 minutes. |
| **Multi-site** | Unlimited websites per installation, with a site switcher, a command palette (<kbd>⌘K</kbd>), per-site time zones and per-site retention. |
| **Data ownership** | CSV export, configurable retention (30 days to forever), and buttons to reset statistics or delete a site. |
| **Operations** | Automatic migrations, `/healthz` and `/readyz`, graceful shutdown with a final flush, and env-only configuration. A distroless, non-root image. |
| **Accessibility** | Keyboard-navigable charts with table views, reduced-motion and reduced-transparency support, and colour-vision-safe chart colours. |

## Quick start

```bash
git clone https://github.com/tryshchenko/trustworthy.git && cd trustworthy
docker compose up -d --build
docker compose logs app | grep setup_code     # one-time code for the first-run screen
open http://localhost:8080
```

Enter the setup code, create the owner account, add a website and copy the snippet. That's it.

> To skip the setup screen, set `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The owner account is then created (or reset) on boot.

## Deploy on Coolify

1. **New Resource →** this repository **→ Build Pack: Docker Compose.** Coolify reads `docker-compose.yml`, generates the database credentials, and assigns a domain to the `app` service on port 8080.
2. **Deploy.** PostgreSQL starts and migrations run automatically.
3. Open the `app` service's **Logs**, copy the `setup_code`, and visit your domain.

[docs/coolify.md](docs/coolify.md) covers the other setup (a Dockerfile app with a Coolify-managed PostgreSQL), plus backups, upgrades and hardening proxy logs.

## Add it to your site

```html
<script defer src="https://stats.example.com/js/script.js"></script>
```

The **Tracking code** page builds the snippet for you. The script is about **1.6 KB gzipped**, and it automatically counts single-page-app navigations.

| Attribute | Effect |
| --- | --- |
| `data-spa="false"` | Don't count History API navigations. |
| `data-respect-dnt` | Skip measurement when Do Not Track or Global Privacy Control is on. |
| `data-outbound` | Send an `Outbound: <host>` event for clicks on external links. |
| `data-allow-localhost` | Count `localhost` while testing. |
| `data-domain="example.com"` | Pick the site explicitly. The page host must still belong to it. |
| `data-api="https://…/api/event"` | Send hits to a custom endpoint, for example through your own proxy. |

Custom events:

```html
<button data-tw-event="Signup">Create account</button>
<script>window.tw && window.tw("Download PDF");</script>
```

## What gets collected

| Data | Example | How it's minimised |
| --- | --- | --- |
| Page path | `/pricing` | The browser drops query strings and fragments. The server replaces e-mails, IDs and tokens with `:id`. |
| Referrer | `news.ycombinator.com` | Only the origin leaves the browser, and only the host is kept. Recorded on arrivals only. |
| Campaign tags | `utm_source=newsletter` | Source, medium and campaign are lower-cased. A tag is dropped if it looks personal. |
| Country | `DE` | Derived from the browser's time zone. No IP geolocation. |
| Browser, OS, device | `Firefox · Linux · Desktop` | Coarse families only. The User-Agent string is discarded immediately. |
| Event name | `Signup` | Names containing e-mails or tokens are rejected. |

**Never collected:** cookies, device storage, IP addresses (never stored or logged), full User-Agents, fingerprints, or visitor and session identifiers. Individual hits are never stored either. The full story is in **[docs/privacy.md](docs/privacy.md)**.

## Honest numbers

| Metric | Meaning |
| --- | --- |
| **Pageviews** | Every page load or in-app navigation. |
| **Visits** | Pageviews that arrived from *outside* the site: a search, a link, a bookmark or a typed URL. One person arriving twice counts twice. |
| **Views per visit** | Pageviews ÷ visits, averaged across all traffic. |
| **Conversion rate** | Goal completions ÷ visits. This is a rate per visit, not a share of people. |
| **Not measured** | Unique or returning visitors, bounce rate, time on page, per-person funnels and session replay. Each would need an identifier. |

The dashboard explains each metric in a tooltip, so nobody mistakes a visit for a person.

## Configuration

Everything is configured through environment variables.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | — *(required)* | PostgreSQL connection string. |
| `PORT` | `8080` | HTTP listen port. |
| `BASE_URL` | *browser origin* | Public URL used in the tracking snippet, e.g. `https://stats.example.com`. |
| `TRUST_PROXY` | `false` | Honour `X-Forwarded-For` and `X-Forwarded-Proto`. Set `true` behind Coolify, Traefik, nginx or Caddy. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | Create or reset the owner on boot, instead of using the setup screen. |
| `DEFAULT_RETENTION_DAYS` | `730` | Retention for new sites. `0` keeps data forever. |
| `COUNTRY_HEADER` | — | Trust a country header from your edge proxy, e.g. `CF-IPCountry`. |
| `SECURE_COOKIES` | `auto` | `Secure` flag on the dashboard session cookie (`auto`, `true` or `false`). |
| `SESSION_TTL` | `720h` | Dashboard login lifetime. |
| `FLUSH_INTERVAL` | `5s` | How often buffered counters are written to PostgreSQL. |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error`. |

## How it works

```
browser ─ script.js ─▶ POST /api/event ─▶ sanitise & classify (in memory)
                                            ├─▶ live ring buffer (30 min, memory only)
                                            └─▶ hourly counters ── every 5 s ──▶ PostgreSQL (UPSERT)
                                                                                   ▲
                                         React dashboard ◀── JSON API ◀── query layer
```

- **Backend:** Go standard library HTTP with pgx. Hourly aggregates are keyed by `(site, hour, dimensions)`, so any filter combines with any breakdown in plain SQL.
- **Frontend:** React 19, Vite, TanStack Query and Orbit UI, with hand-built SVG charts. It is compiled into the binary with `go:embed`.
- **Security:** a single owner account with bcrypt passwords and hashed session tokens. The first run requires a setup code from the logs. There's CSRF and Origin checking, a strict CSP, and rate-limited login and collection.

Read [docs/architecture.md](docs/architecture.md) for the data model and the trade-offs.

## Development

You'll need Go 1.26+, Node 20.19+, pnpm 10 and Docker.

```bash
pnpm install
make db-up                                   # disposable PostgreSQL on :55432
DATABASE_URL='postgres://postgres:test@localhost:55432/postgres?sslmode=disable' \
  ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='dev password 1' go run ./cmd/trustworthy
pnpm dev                                     # dashboard with HMR on :5173, API proxied to :8080
```

To fill a **throwaway** database with realistic demo data (this is how the screenshots were made), run:

```bash
DATABASE_URL=… go run ./cmd/demo-seed -domain demo.example.com -days 400
```

`make build` produces a self-contained `./trustworthy` binary. `make docker` builds the production image.

## Testing

```bash
make test        # Go + dashboard unit tests
make test-db     # adds end-to-end tests against a real PostgreSQL
```

The tests cover:

- sanitising paths, referrers, UTM tags and event names
- bot filtering and User-Agent classification
- arrival logic for reloads, back/forward and SPA navigation
- domain-spoofing protection
- additive aggregation, filters, goals, time-zone- and DST-correct ranges, export and retention
- auth, CSRF and rate limiting

One integration test dumps **every row of every table** after real traffic and asserts that no IP, User-Agent, e-mail or time zone was persisted.

## Project layout

```
cmd/trustworthy        server (also `healthcheck`, `version`)
cmd/demo-seed          dev-only synthetic data generator
internal/privacy       sanitisation, UA classification, channels, bot filter
internal/ingest        collection → hourly counters → batched UPSERTs; live view
internal/stats         query layer and CSV export
internal/server        HTTP API, collection endpoint, middleware, SPA
internal/…             config, auth, geo, migrations, tracker script, embedded web build
web/                   React dashboard
third_party/orbit-ui   vendored Orbit UI design system
docs/                  Coolify deployment, privacy model, architecture
```

## Credits

The interface is built with **[Orbit UI](https://github.com/tryshchenko/orbit-ui)**, a Frutiger-Aero-inspired design system vendored in [`third_party/orbit-ui`](third_party/orbit-ui/FORK.md). Product inspiration comes from the privacy-friendly analytics movement, including Simple Analytics, Plausible and Fathom.

<sub>Trustworthy is provided as-is. The privacy documentation is an engineering assessment, not legal advice. Check your setup with your data-protection officer or counsel.</sub>
