import { Code } from "../ui";

const collected: [string, string, string][] = [
  ["Page path", "/pricing", "Query strings and fragments are removed in the browser. Path segments that look like e-mails, IDs, UUIDs, long numbers or tokens are replaced with :id on the server."],
  ["Referring site", "news.ycombinator.com", "Only the origin leaves the browser; only the host name is kept. Recorded on the first page of a visit only."],
  ["Campaign tags", "utm_source=newsletter", "utm_source, utm_medium and utm_campaign (and ref). Lower-cased; dropped entirely if they contain an e-mail or token. utm_content and utm_term are ignored."],
  ["Country", "DE", "Derived from the browser's time-zone setting — no IP geolocation. Optionally, a country header set by your own edge proxy."],
  ["Browser, OS, device", "Firefox · Linux · Desktop", "Coarse families from the User-Agent and viewport width. The User-Agent string itself is discarded immediately."],
  ["Custom event name", "Signup", "Labels you choose. Names containing e-mails or tokens are rejected."],
];

const never = [
  "Cookies, localStorage, sessionStorage, IndexedDB or any other storage on the visitor's device.",
  "IP addresses — never stored or logged. Used in memory only, as a salted hash rotated on every restart, to rate-limit abuse for a few minutes.",
  "Full User-Agent strings, screen fingerprints or any device identifier.",
  "Visitor, session or cross-request identifiers of any kind.",
  "Individual hits — every request is folded into an hourly counter before it is written.",
  "Journeys, per-person funnels, returning-visitor detection, session replay or profiling.",
  "Anything sent to third parties: no CDNs, no telemetry, no external services.",
];

const numbers: [string, string][] = [
  ["Pageviews", "every page load or in-app navigation."],
  ["Visits", "pageviews that came from outside the site (search, link, bookmark, typed address). Reloads, back/forward and in-site navigation are excluded."],
  ["Not measured", "unique visitors, returning visitors, bounce rate, time on page and per-person paths. Each would need an identifier."],
  ["Conversion rate", "goal completions ÷ visits — a rate per visit, not a share of people."],
];

const policy = `This website uses Trustworthy, a self-hosted analytics tool, to understand how the site is used. It does not use cookies or store anything on your device, and it does not collect personal data or identify you.

For each page view, we record the page address (without query parameters), the website that linked to us, any campaign tags in the link, a coarse browser, operating system and device type, and a country estimated from your device's time-zone setting. Your IP address is not stored. These details are combined into anonymous hourly totals immediately; we cannot tell which visits belong to the same person.

The data is hosted on our own server and is not shared with third parties.`;

export function PrivacyPage() {
  return (
    <>
      <div className="page-head">
        <p className="eyebrow">Disclosure</p>
        <h1 className="display">Privacy & data</h1>
        <p className="lede">
          Exactly what Trustworthy measures, how each value is reduced before storage, and what it never touches. Share it with your visitors, your DPO or your
          legal counsel.
        </p>
      </div>

      <section className="split">
        <header>
          <p className="eyebrow">01</p>
          <h2 className="h2" style={{ marginTop: "0.75rem" }}>
            What is collected
          </h2>
        </header>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Stored as</th>
                <th scope="col">How it's minimised</th>
              </tr>
            </thead>
            <tbody>
              {collected.map(([what, ex, how]) => (
                <tr key={what}>
                  <th scope="row" style={{ whiteSpace: "nowrap" }}>
                    {what}
                  </th>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="code-inline">{ex}</span>
                  </td>
                  <td className="muted small">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="split">
        <header>
          <p className="eyebrow">02</p>
          <h2 className="h2" style={{ marginTop: "0.75rem" }}>
            Never collected
          </h2>
        </header>
        <ul className="ticks ticks--no">
          {never.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="split">
        <header>
          <p className="eyebrow">03</p>
          <h2 className="h2" style={{ marginTop: "0.75rem" }}>
            How the numbers work
          </h2>
        </header>
        <ul className="ticks">
          {numbers.map(([k, v]) => (
            <li key={k}>
              <b>{k}:</b> {v}
            </li>
          ))}
        </ul>
      </section>

      <section className="split">
        <header>
          <p className="eyebrow">04</p>
          <h2 className="h2" style={{ marginTop: "0.75rem" }}>
            Legal position
          </h2>
          <p>Please read before you rely on it.</p>
        </header>
        <div className="prose">
          <p>
            Trustworthy is designed so that, in most configurations, it neither stores nor reads information on visitors' devices and does not process personal
            data in a way that identifies individuals. On that basis many operators conclude that no consent banner is required under the GDPR and the ePrivacy
            Directive (Art. 5(3)). <b>This is an engineering assessment, not legal advice, and compliance is never automatic.</b>
          </p>
          <ul>
            <li>
              The visitor's IP address and User-Agent are necessarily received with each request and used transiently (rate limiting and browser/OS
              classification). Under the GDPR this is still processing of personal data, however brief; most operators rely on legitimate interest and should
              mention it in their privacy notice.
            </li>
            <li>
              Some regulators interpret Art. 5(3) ePrivacy broadly — including JavaScript that reads device properties such as time zone or viewport width.
              National implementations differ (e.g. Germany's TTDSG §25, France's CNIL audience-measurement exemption with its own conditions).
            </li>
            <li>Your reverse proxy (Coolify/Traefik, CDN, load balancer) may log IP addresses independently. Disable or anonymise those logs — see the deployment guide.</li>
            <li>Don't put personal data into page paths, campaign tags or event names. Sanitisation is defence in depth, not a licence.</li>
          </ul>
          <p>Check your setup with your data-protection officer or counsel for the jurisdictions you operate in.</p>
        </div>
      </section>

      <section className="split">
        <header>
          <p className="eyebrow">05</p>
          <h2 className="h2" style={{ marginTop: "0.75rem" }}>
            Privacy-notice text
          </h2>
          <p>A starting point. Adapt it to your organisation and jurisdiction.</p>
        </header>
        <Code text={policy} label="Privacy notice text" prose />
      </section>
    </>
  );
}
