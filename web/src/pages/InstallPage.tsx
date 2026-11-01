import { Check, CircleCheck, Copy, ExternalLink, ShieldCheck } from "@orbit/icons";
import { Button, IconButton, Panel, Spinner, Switch, toast } from "@orbit/ui";
import { useEffect, useState, type ReactNode } from "react";
import type { Site } from "../lib/api";
import { timeAgo } from "../lib/format";
import { useSites } from "../lib/queries";
import { Link } from "../lib/router";
import { SiteHeader } from "./OverviewPage";

/** Copy-to-clipboard code block. `tokens` are pre-highlighted spans; `text` is what gets copied. */
export function CodeBlock({ text, children, label }: { text: string; children: ReactNode; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed — select the text and copy it manually", tone: "warning" });
    }
  };
  return (
    <div className="relative">
      <pre className="tw-code" aria-label={label}>
        <code>{children}</code>
      </pre>
      <span className="tw-code__copy" data-orbit-chrome="">
        <IconButton label={copied ? "Copied" : "Copy to clipboard"} icon={copied ? <Check size={15} /> : <Copy size={15} />} size="sm" variant="ghost" onClick={() => void copy()} />
      </span>
    </div>
  );
}

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
    if (window.location.hash === "#events") document.getElementById("events")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggle = (k: keyof Options) => (v: boolean) => setO((p) => ({ ...p, [k]: v }));

  return (
    <div className="tw-page">
      <SiteHeader site={site} title="Tracking code" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title={
              <span className="flex items-center gap-3">
                <span className="tw-step">1</span> Add the script to your site
              </span>
            }
            description={
              <>
                Paste this into the <span className="tw-inline-code">&lt;head&gt;</span> of every page on <b>{site.domain}</b> (subdomains are included).
              </>
            }
          >
            <CodeBlock text={text} label="Tracking snippet">
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
            </CodeBlock>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Switch label="Single-page app navigation" description="Count route changes made with the History API." checked={o.spa} onCheckedChange={toggle("spa")} />
              <Switch label="Honour Do Not Track / GPC" description="Skip measurement when the browser asks not to be tracked." checked={o.dnt} onCheckedChange={toggle("dnt")} />
              <Switch label="Outbound link clicks" description="Send an “Outbound: domain” event for external links." checked={o.outbound} onCheckedChange={toggle("outbound")} />
              <Switch label="Count localhost" description="Useful while testing. Off in production." checked={o.localhost} onCheckedChange={toggle("localhost")} />
            </div>
          </Panel>

          <Panel
            id="events"
            title={
              <span className="flex items-center gap-3">
                <span className="tw-step">2</span> Track events <span className="text-sm font-normal text-fg-subtle">optional</span>
              </span>
            }
            description="Name actions you care about. Event names are labels — never put personal data in them."
          >
            <div className="flex flex-col gap-3">
              <p className="m-0 text-sm text-fg-muted">Add an attribute to any clickable element:</p>
              <CodeBlock text={`<button data-tw-event="Signup">Create account</button>`} label="Event attribute example">
                <T c="tag">&lt;button</T> <T c="attr">data-tw-event</T>=<T c="str">"Signup"</T>
                <T c="tag">&gt;</T>Create account<T c="tag">&lt;/button&gt;</T>
              </CodeBlock>
              <p className="m-0 text-sm text-fg-muted">…or call it from JavaScript, e.g. after a form succeeds:</p>
              <CodeBlock text={`window.tw && window.tw("Download PDF");`} label="JavaScript event example">
                <T c="com">// safe to call even if the script was blocked</T>
                {"\n"}window.tw && window.<T c="attr">tw</T>(<T c="str">"Download PDF"</T>);
              </CodeBlock>
              <p className="m-0 text-sm text-fg-muted">
                Then turn events into <Link href={`/sites/${site.id}/goals`} className="text-accent-fg hover:underline">conversion goals</Link>.
              </p>
            </div>
          </Panel>

          <Panel
            title={
              <span className="flex items-center gap-3">
                <span className="tw-step">3</span> Check that it works
              </span>
            }
          >
            <div className="flex flex-wrap items-center gap-4">
              {receiving ? (
                <span className="inline-flex items-center gap-2 font-medium" style={{ color: "var(--orb-color-success-fg)" }} role="status">
                  <CircleCheck size={20} aria-hidden /> Receiving data — last activity {timeAgo(current.lastHitAt)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-3 text-fg-muted" role="status">
                  <Spinner size="sm" /> Waiting for the first pageview…
                </span>
              )}
              <span className="flex-1" />
              <Button asChild variant="secondary" trailingIcon={<ExternalLink size={14} />}>
                <a href={`https://${site.domain}`} target="_blank" rel="noreferrer noopener">
                  Open {site.domain}
                </a>
              </Button>
              {receiving && (
                <Button asChild variant="primary">
                  <Link href={`/sites/${site.id}`}>View dashboard</Link>
                </Button>
              )}
            </div>
            <p className="mb-0 mt-3 text-xs text-fg-subtle">
              Nothing showing? Ad blockers may block analytics scripts, and your own visits from <span className="tw-inline-code">localhost</span> are ignored unless enabled above.
            </p>
          </Panel>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="What this script does">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
              {[
                "About 1.6 KB gzipped, loaded with defer — never blocks rendering.",
                "Sets no cookies and uses no localStorage, sessionStorage or IndexedDB.",
                "Sends the page path, campaign tags, the referring site's origin, viewport width and time zone.",
                "Strips query strings and fragments in the browser before anything is sent.",
                "Creates no identifier — requests can't be linked to each other or to a person.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 flex-none" style={{ color: "var(--orb-color-success-solid)" }} aria-hidden />
                  <span className="text-fg-muted">{t}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="soft" size="sm" className="mt-4" leadingIcon={<ShieldCheck size={15} />}>
              <Link href="/privacy">Read the full data disclosure</Link>
            </Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
