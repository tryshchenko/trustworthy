# Deploying Trustworthy on Coolify

Trustworthy is a single container (a distroless image, about 14 MB) plus PostgreSQL. You can deploy it on Coolify v4 in either of two ways.

## Option A: Docker Compose (app and database together)

This option is the quickest. The database lives in the same Coolify resource.

1. **Projects → your project → + New → Public Repository** (or Private Repository via GitHub App or deploy key), and point it at this repository.
2. Choose **Build Pack: Docker Compose**. Leave the compose location at `/docker-compose.yml`.
3. Coolify parses the file:
   - `SERVICE_USER_POSTGRES` and `SERVICE_PASSWORD_POSTGRES` are **generated automatically**, so the database password never sits in Git.
   - `SERVICE_FQDN_APP_8080` asks Coolify to assign a domain to the `app` service and route it to port 8080. Set your own domain under **app → Settings → Domains**, for example `https://stats.example.com`.
4. Optional environment variables (**Environment Variables** tab):
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` create the owner without the setup screen.
   - `DEFAULT_RETENTION_DAYS` sets the default retention, in days, for new sites.
   - `COUNTRY_HEADER=CF-IPCountry` only if Cloudflare proxies your stats domain.
5. **Deploy.** The app waits for PostgreSQL to report healthy, then applies migrations automatically.
6. Open **Logs** for the `app` service and find the line `no owner account yet … setup_code=XXXX-XXXX-XXXX`. Visit your domain, enter the code, and create the owner account.

> A new setup code is generated on every start until the owner exists. Always copy the code from the newest log line.

## Option B: Dockerfile app with a Coolify-managed PostgreSQL

Choose this option if you want Coolify's database UI, scheduled backups and separate lifecycles.

1. **+ New → Database → PostgreSQL** (version 16 or 17). Start it and copy the **Postgres URL (internal)**.
2. **+ New → Public/Private Repository** for this repository, with **Build Pack: Dockerfile**.
   - **Ports Exposes:** `8080`
   - **Domains:** `https://stats.example.com`
   - **Health Check:** enabled, path `/healthz`, port `8080`. The image also ships a Docker `HEALTHCHECK`.
3. Environment variables:

   ```
   DATABASE_URL=<internal Postgres URL from step 1>
   TRUST_PROXY=true
   BASE_URL=https://stats.example.com
   ```

4. Deploy, then find the `setup_code` in the logs as described in Option A.

## After deploying

1. Add a website in the dashboard. You'll land on **Tracking code**.
2. Paste the snippet into the `<head>` of your site. The **Check that it works** panel turns green as soon as the first pageview arrives.
3. If you run Trustworthy on the same domain as the site, nothing else is needed. If it runs on another domain, it already sends the right CORS headers for the collection endpoint.

## Upgrades

- Push or pull the new version and press **Redeploy**. Migrations run automatically on start, inside a PostgreSQL advisory lock, so a rolling restart is safe.
- On shutdown the server stops accepting requests and flushes buffered counters. At most a few seconds of hits sit in memory at any time (`FLUSH_INTERVAL`, default 5 seconds).
- Run **one replica**. Live (30-minute) counters are kept in process memory.

## Backups

- **Option A:** add a scheduled backup for the `db` service volume, or run `pg_dump` from a scheduled task.
- **Option B:** use the PostgreSQL resource's **Backups** tab. S3-compatible destinations are supported.

Everything stored is anonymous hourly aggregates and configuration, so backups hold no visitor personal data.

## Privacy hardening for the proxy

Trustworthy never logs IP addresses or User-Agents. **The reverse proxy in front of it might.** Check how Coolify's Traefik proxy is configured on your server (**Servers → your server → Proxy**):

- Make sure there's no `--accesslog=true` in the proxy configuration.
- If you need access logs for other services, drop client addresses and headers:

  ```
  --accesslog.fields.names.ClientAddr=drop
  --accesslog.fields.names.ClientHost=drop
  --accesslog.fields.headers.defaultmode=drop
  ```

- If a CDN or WAF (such as Cloudflare) sits in front of Coolify, review its logging and retention settings too.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `fatal: DATABASE_URL is required` | Set `DATABASE_URL` (Option B), or check that the compose file was used (Option A). |
| `connect to database: …` after 60 s | The database isn't reachable. Use the **internal** URL, and run app and database on the same server or network. |
| The dashboard login loops | Make sure the domain uses HTTPS and `TRUST_PROXY=true`, so `Secure` cookies are set correctly. |
| No pageviews arrive | The page's host must be the site's domain or a subdomain of it. Ad blockers can block analytics scripts. `localhost` is ignored unless `data-allow-localhost` is set. Requests that fail show a JSON error in the browser's Network tab. |
| Wrong snippet URL | Set `BASE_URL` to your public URL. |
