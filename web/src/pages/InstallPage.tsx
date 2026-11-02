import { useEffect, useState, type ReactNode } from "react";
import type { Site } from "../lib/api";
import { timeAgo } from "../lib/format";
import { useSites } from "../lib/queries";
import { Link } from "../lib/router";
import { ButtonLink, Checkbox, Code, Dial, Icon } from "../ui";

const T = ({ c, children }: { c: "tag" | "attr" | "str" | "com"; children: ReactNode }) => <span className={`tok-${c}`}>{children}</span>;

interface Options {
  spa: boolean;
  dnt: boolean;
  outbound: boolean;
  localhost: boolean;
}

function snippetAttrs(origin: string, o: Options): [string, string][] {
  const attrs: [string, string][] = [["src", `${origin}/js/script.js`]];
  if (!o.spa) attrs.push(["data-spa", "false"]);
  if (o.dnt) attrs.push(["data-respect-dnt", ""]);
  if (o.outbound) attrs.push(["data-outbound", ""]);
  if (o.localhost) attrs.push(["data-allow-localhost", ""]);
  return attrs;
}

export function InstallPage({ site, baseUrl }: { site: Site; baseUrl?: string }) {
  const origin = baseUrl || window.location.origin;
  const [o, setO] = useState<Options>({ spa: true, dnt: false, outbound: false, localhost: false });
  const attrs = snippetAttrs(origin, o);
  const text = `<script defer ${attrs.map(([k, v]) => (v ? `${k}="${v}"` : k)).join(" ")}></script>`;

  // Poll for the first hit while this page is open.
  const sites = useSites();
  const current = sites.data?.find((s) => s.id === site.id) ?? site;
  const receiving = !!current.lastHitAt;
  useEffect(() => {
    if (receiving) return;
    const t = setInterval(() => void sites.refetch(), 5000);
    return () => clearInterval(t);
  }, [receiving, sites]);

  useEffect(() => {
    if (window.location.hash === "#events") document.getElementById("events")?.scrollIntoView({ block: "start" });
  }, []);

  const toggle = (k: keyof Options) => (v: boolean) => setO((p) => ({ ...p, [k]: v }));

  return (
    <>
      <ol className="numbered">
        <li>
          <span className="n">01</span>
          <div className="stack" style={{ gap: "1.1rem" }}>
            <div>
              <h2 className="h2">Add the script</h2>
              <p className="muted" style={{ marginTop: "0.4rem" }}>
                Paste it into the <span className="code-inline">&lt;head&gt;</span> of every page on <b style={{ color: "var(--ink)" }}>{site.domain}</b>. Subdomains are
                included.
              </p>
            </div>
            <Code text={text} label="Tracking snippet">
              <T c="tag">&lt;script</T> <T c="attr">defer</T>
              {attrs.map(([k, v]) => (
                <span key={k}>
                  {" "}
                  <T c="attr">{k}</T>
                  {v && (
                    <>
                      =<T c="str">"{v}"</T>
                    </>
                  )}
                </span>
              ))}
              <T c="tag">&gt;&lt;/script&gt;</T>
            </Code>
            <div className="form-grid" style={{ marginTop: "0.5rem" }}>
              <Checkbox label="Single-page app navigation" hint="Count route changes made with the History API." checked={o.spa} onChange={toggle("spa")} />
              <Checkbox label="Honour Do Not Track and GPC" hint="Skip measurement when the browser asks not to be tracked." checked={o.dnt} onChange={toggle("dnt")} />
              <Checkbox label="Outbound link clicks" hint="Send an “Outbound: domain” event for external links." checked={o.outbound} onChange={toggle("outbound")} />
              <Checkbox label="Count localhost" hint="Useful while testing. Leave off in production." checked={o.localhost} onChange={toggle("localhost")} />
            </div>
          </div>
        </li>

        <li id="events" style={{ scrollMarginTop: "1rem" }}>
          <span className="n">02</span>
          <div className="stack" style={{ gap: "1.1rem" }}>
            <div>
              <h2 className="h2">
                Track events <span className="label" style={{ display: "inline", marginLeft: "0.5rem" }}>Optional</span>
              </h2>
              <p className="muted" style={{ marginTop: "0.4rem" }}>
                Name the actions you care about. Event names are labels — never put personal data in them.
              </p>
            </div>
            <p className="small">Add an attribute to any clickable element:</p>
            <Code text={`<button data-tw-event="Signup">Create account</button>`} label="Event attribute example">
              <T c="tag">&lt;button</T> <T c="attr">data-tw-event</T>=<T c="str">"Signup"</T>
              <T c="tag">&gt;</T>Create account<T c="tag">&lt;/button&gt;</T>
            </Code>
            <p className="small">Or call it from JavaScript, for example after a form succeeds:</p>
            <Code text={`window.tw && window.tw("Download PDF");`} label="JavaScript event example">
              <T c="com">// safe to call even if the script was blocked</T>
              {"\n"}window.tw && window.<T c="attr">tw</T>(<T c="str">"Download PDF"</T>);
            </Code>
            <p className="small">
              Then turn events into{" "}
              <Link href={`/sites/${site.id}/goals`} className="link">
                conversion goals
              </Link>
              .
            </p>
          </div>
        </li>

        <li>
          <span className="n">03</span>
          <div className="stack" style={{ gap: "1.1rem" }}>
            <h2 className="h2">Check that it works</h2>
            <div className="row-flex" style={{ gap: "1rem 2rem" }}>
              {receiving ? (
                <span className="live" role="status">
                  <span className="live__dot" aria-hidden />
                  Receiving data — last activity {timeAgo(current.lastHitAt)}
                </span>
              ) : (
                <span className="live muted" role="status">
                  <Dial label="Waiting" /> Waiting for the first pageview…
                </span>
              )}
              <span className="spacer" />
              <ButtonLink href={`https://${site.domain}`} external>
                Open {site.domain} <Icon name="arrow-up-right" />
              </ButtonLink>
              {receiving && (
                <ButtonLink href={`/sites/${site.id}`} variant="primary">
                  View dashboard
                </ButtonLink>
              )}
            </div>
            <p className="xsmall muted">
              Nothing showing? Ad blockers may block analytics scripts, and visits from <span className="code-inline">localhost</span> are ignored unless enabled
              above.
            </p>
          </div>
        </li>

        <li>
          <span className="n">—</span>
          <div className="stack" style={{ gap: "1rem" }}>
            <h2 className="h3">What the script does</h2>
            <ul className="ticks" style={{ maxWidth: "46rem" }}>
              <li>About 1.6 KB gzipped and loaded with defer, so it never blocks rendering.</li>
              <li>Sets no cookies and uses no localStorage, sessionStorage or IndexedDB.</li>
              <li>Sends the page path, campaign tags, the referring site's origin, viewport width and time zone.</li>
              <li>Strips query strings and fragments in the browser before anything is sent.</li>
              <li>Creates no identifier. Requests can't be linked to each other or to a person.</li>
            </ul>
            <Link href="/privacy" className="link small">
              Read the full data disclosure →
            </Link>
          </div>
        </li>
      </ol>
    </>
  );
}
