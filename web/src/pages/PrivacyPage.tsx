import { Ban, Check, Scale } from "@orbit/icons";
import { Panel } from "@orbit/ui";
import { CodeBlock } from "./InstallPage";

const collected: [string, string, string][] = [
  ["Page path", "/pricing", "Query strings and fragments are removed in the browser. Path segments that look like e-mails, IDs, UUIDs, long numbers or tokens are replaced with :id on the server."],
  ["Referring site", "news.ycombinator.com", "Only the origin leaves the browser; only the host name is kept. Only recorded on the first page of a visit."],
  ["Campaign tags", "utm_source=newsletter", "utm_source, utm_medium and utm_campaign (and ref). Lower-cased; dropped entirely if they contain an e-mail or token. utm_content and utm_term are ignored."],
  ["Country", "DE", "Derived from the browser's time-zone setting — no IP geolocation. Optional: a country header set by your own edge proxy."],
  ["Browser, OS, device", "Firefox · Linux · Desktop", "Coarse families from the User-Agent and viewport width. The User-Agent string itself is discarded immediately."],
  ["Custom event name", "Signup", "Labels you choose. Names containing e-mails or tokens are rejected."],
];

const never = [
  "Cookies, localStorage, sessionStorage, IndexedDB or any other storage on the visitor's device",
  "IP addresses — never stored or logged. Used in memory only, as a salted hash rotated on every restart, to rate-limit abuse for a few minutes",
  "Full User-Agent strings, screen fingerprints or any device identifier",
  "Visitor, session or cross-request identifiers of any kind",
  "Individual hits — every request is folded into an hourly counter before it is written",
  "Journeys, funnels per person, returning-visitor detection, session replay or profiling",
  "Anything sent to third parties: no CDNs, no telemetry, no external services",
];

const policy = `This website uses Trustworthy, a self-hosted analytics tool, to understand how the site is used. It does not use cookies or store anything on your device, and it does not collect personal data or identify you.

For each page view, we record the page address (without query parameters), the website that linked to us, any campaign tags in the link, a coarse browser, operating system and device type, and a country estimated from your device's time-zone setting. Your IP address is not stored. These details are combined into anonymous hourly totals immediately; we cannot tell which visits belong to the same person.

The data is hosted on our own server and is not shared with third parties.`;

export function PrivacyPage() {
  return (
    <div className="tw-page">
      <div className="px-1 pt-1">
        <h1 className="orb-type-page-title m-0">Privacy & data</h1>
        <p className="m-0 max-w-3xl text-sm text-fg-muted">
          Exactly what Trustworthy measures, how each value is reduced before storage, and what it never touches. Share this with your visitors, your DPO or your
          legal counsel.
        </p>
      </div>

      <Panel title="What is collected" bodyClassName="!p-0">
        <div className="overflow-x-auto">
          <table className="tw-table">
            <thead>
              <tr>
                <th scope="col" className="!pl-4">
                  Data
                </th>
                <th scope="col">Example stored value</th>
                <th scope="col">How it's minimised</th>
              </tr>
            </thead>
            <tbody>
              {collected.map(([what, ex, how]) => (
                <tr key={what}>
                  <th scope="row" className="!pl-4 font-medium whitespace-nowrap">
                    {what}
                  </th>
                  <td className="whitespace-nowrap">
                    <span className="tw-inline-code">{ex}</span>
                  </td>
                  <td className="text-fg-muted">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Never collected">
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
            {never.map((t) => (
              <li key={t} className="flex gap-2.5">
                <Ban size={16} className="mt-0.5 flex-none" style={{ color: "var(--orb-color-danger-solid)" }} aria-hidden />
                <span className="text-fg-muted">{t}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="How the numbers work">
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm text-fg-muted">
            {[
              ["Pageviews", "every page load or in-app navigation."],
              ["Visits", "pageviews that came from outside the site (search, link, bookmark, typed address). Reloads, back/forward and in-site navigation are excluded."],
              ["Not measured", "unique visitors, returning visitors, bounce rate, time on page and per-person paths. Each would need an identifier."],
              ["Conversion rate", "goal completions ÷ visits — a rate per visit, not a share of people."],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-2.5">
                <Check size={16} className="mt-0.5 flex-none" style={{ color: "var(--orb-color-success-solid)" }} aria-hidden />
                <span>
                  <b className="text-fg">{k}:</b> {v}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Scale size={18} aria-hidden /> Legal position — please read
          </span>
        }
      >
        <div className="flex max-w-4xl flex-col gap-3 text-sm text-fg-muted">
          <p className="m-0">
            Trustworthy is designed so that, in most configurations, it neither stores nor reads information on visitors' devices and does not process personal
            data in a way that identifies individuals. On that basis many operators conclude that no consent banner is required under the GDPR and the ePrivacy
            Directive (Art. 5(3)). <b className="text-fg">This is an engineering assessment, not legal advice, and compliance is never automatic.</b>
          </p>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
            <li>
              The visitor's IP address and User-Agent are necessarily received with each request and used transiently (rate limiting and browser/OS
              classification). Under the GDPR this is still processing of personal data, however brief; most operators rely on legitimate interest and should
              mention it in their privacy notice.
            </li>
            <li>
              Some regulators interpret Art. 5(3) ePrivacy broadly — including JavaScript that reads device properties such as time zone or viewport width. National
              implementations differ (e.g. Germany's TTDSG §25, France's CNIL audience-measurement exemption with its own conditions).
            </li>
            <li>Your reverse proxy (Coolify/Traefik, CDN, load balancer) may log IP addresses independently. Disable or anonymise those logs — see the deployment guide.</li>
            <li>Don't put personal data into page paths, campaign tags or event names. Sanitisation is defence in depth, not a licence.</li>
          </ul>
          <p className="m-0">Check your setup with your data-protection officer or counsel for the jurisdictions you operate in.</p>
        </div>
      </Panel>

      <Panel title="Suggested privacy-notice text" description="Adapt it to your organisation and jurisdiction.">
        <CodeBlock text={policy} label="Privacy notice text">
          <span style={{ whiteSpace: "pre-wrap", fontFamily: "var(--orb-font-sans)", fontSize: 14 }}>{policy}</span>
        </CodeBlock>
      </Panel>
    </div>
  );
}
