# Privacy model and legal assumptions

This document says what Trustworthy collects, how it processes the data, and why we think the design supports banner-free analytics in many jurisdictions. It is an **engineering assessment, not legal advice**. You, as the operator, are the controller and remain responsible for compliance.

## 1. What leaves the visitor's browser

The tracking script sends one small JSON body per pageview or event:

| Field | Example | Notes |
| --- | --- | --- |
| `u`, the page URL | `https://example.com/pricing?utm_source=newsletter` | Built from `origin + pathname`. The browser drops every query parameter except `utm_source`, `utm_medium`, `utm_campaign`, `ref` and `source`. The fragment is never sent. |
| `r`, the referrer | `https://news.ycombinator.com` | Only the **origin** of `document.referrer`, never its path or query. For SPA navigations it is the site's own origin. |
| `w`, viewport width | `1440` | Used to classify the device as desktop, tablet or mobile. Not stored. |
| `tz`, time zone | `Europe/Berlin` | Used to estimate a country. Not stored. |
| `t`, navigation type | `reload` | Lets the server avoid counting reloads and back/forward navigation as new visits. |
| `n`, event name | `Signup` | Only for custom events. |
| `d`, domain | `example.com` | Only if `data-domain` is set. |

The script reads nothing from storage and writes nothing to it: no cookies, `localStorage`, `sessionStorage`, IndexedDB or cache tricks. It generates no random IDs and does no fingerprinting.

## 2. What the server does with a request

The work happens in memory, within one request, in `internal/ingest` and `internal/privacy`:

1. **Bot filter.** Empty or automated User-Agents and known crawlers are dropped.
2. **URL cleaning.** Path segments that look like e-mail addresses, UUIDs, long hex or base64 tokens, or runs of six or more digits (order numbers, phone numbers) become `:id`. Very long segments are treated the same way.
3. **Referrer.** The referrer is reduced to its host name. Self-referrals and referrals from subdomains of the site count as internal.
4. **Campaign tags.** Values are lower-cased and **dropped entirely** if they contain an e-mail address, markup or a token. `utm_content` and `utm_term` are ignored because they are often per-recipient.
5. **Event names.** Only a conservative character set is allowed. A name that contains an e-mail address or a token is rejected.
6. **Device classification.** The User-Agent is reduced to a browser family, an OS family and a device class (from the viewport width). The User-Agent string is then discarded.
7. **Country.** The country comes from the time zone through a static IANA `zone.tab` table, with **no IP geolocation**. You can instead configure a trusted edge-proxy header such as `CF-IPCountry`.
8. **Arrival flag.** A pageview is an *arrival* (a visit) when its referrer is external or empty and it isn't a reload, back/forward or SPA navigation. This is a property of the single request. Nothing links it to any other request.
9. **Aggregation.** The cleaned hit increments an in-memory counter keyed by `(site, hour, dimensions)`. Every few seconds the counters are added into `stats_hourly` with an UPSERT. **Individual hits are never written anywhere.**

### IP address

The IP address reaches the server with every HTTP request, because that is how TCP works. Trustworthy uses it only for in-memory rate limiting, as a SHA-256 of a per-process random salt plus the IP. The salt is regenerated on every start and limiter entries expire after a few minutes. The IP is never written to the database or to logs. The HTTP server's internal error log is passed through an IP-redacting filter.

### Logs

Application logs contain no IP addresses, User-Agents or query strings. Collection requests aren't logged unless they fail with a 5xx error. **Your reverse proxy may still log IPs** (see [coolify.md](coolify.md#privacy-hardening-for-the-proxy)).

## 3. What is stored

| Table | Contents |
| --- | --- |
| `stats_hourly` | Hour, sanitised path, referrer host, channel, UTM source/medium/campaign, country code, browser, OS, device, event name, and two counters (hits and arrivals). |
| `sites`, `goals` | Your configuration. |
| `owner`, `sessions` | Owner e-mail address, a bcrypt password hash, and SHA-256 hashes of dashboard session tokens. Dashboard cookies belong to the owner, never to visitors. |

The aggregates are bounded per hour and dimension combination. When traffic is very low, an hourly row can stand for a single pageview. Even then the row carries no identifier, no IP and no exact timestamp (only the hour), and it can't be linked to any other row.

Retention is configurable per site, with a default of two years. A background job deletes expired aggregates every six hours.

## 4. What is deliberately not offered

Several common analytics features would require an identifier, so Trustworthy doesn't offer them:

- unique or returning visitors
- sessions and bounce rate
- time on page
- user journeys and per-person funnels
- session replay
- cohort or behavioural profiling

The dashboard explains these limits wherever a number could otherwise be misread. For example, visits and conversion rates come with tooltips.

## 5. Legal assumptions

### ePrivacy Directive, Art. 5(3)

Consent is required for *storing* information on, or *gaining access* to information already stored on, a user's terminal equipment, unless the storage or access is strictly necessary.

- Trustworthy stores nothing on the device.
- The script does *read* a few environment properties: viewport width, time zone, `navigator.webdriver`, Do Not Track / GPC, and the navigation type. Some regulators (see the EDPB Guidelines 2/2023 on the technical scope of Art. 5(3)) interpret "gaining access" broadly enough to cover such JavaScript reads. Under that interpretation, consent or a national exemption may be needed even without cookies.
- National implementations differ. Examples:
  - **France (CNIL)** has an audience-measurement exemption with specific conditions, such as strictly limited purposes, aggregate statistics and limited retention.
  - **Germany (TTDSG §25)** has no general analytics exemption.

### GDPR

- The design aims to produce anonymous statistics. The transient processing of the IP address and User-Agent while a request is handled, and the IP-based rate limiting, is still processing of personal data. Operators usually rely on **legitimate interest (Art. 6(1)(f))** for it. Document it in your privacy notice and records of processing.
- You remain the controller. Trustworthy is self-hosted, so no processor agreement with us is needed. Your hosting provider may be a processor.
- Don't put personal data into URLs, campaign tags or event names. Sanitisation is defence in depth, not a substitute for this.

### Things that can break these assumptions

- Proxy, CDN or WAF access logs that keep IP addresses.
- Turning on `COUNTRY_HEADER` with a proxy that geolocates IPs. That is generally fine because only the country is kept, but it's worth mentioning in your notice.
- Customising the script to send more fields.

**Recommendation:** have your DPO or counsel review this document against the jurisdictions you operate in before you decide not to show a consent banner. The dashboard's **Privacy & data** page includes a suggested privacy-notice paragraph.
