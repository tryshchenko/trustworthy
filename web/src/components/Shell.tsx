import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SiteView } from "../App";
import { api, type Site } from "../lib/api";
import { compact, timeAgo } from "../lib/format";
import { useRealtime } from "../lib/queries";
import { Link, navigate } from "../lib/router";
import { Icon, Popover } from "../ui";

const siteNav: { view: SiteView; label: string; path: string }[] = [
  { view: "overview", label: "Overview", path: "" },
  { view: "live", label: "Live", path: "/live" },
  { view: "goals", label: "Goals", path: "/goals" },
  { view: "install", label: "Tracking code", path: "/install" },
  { view: "settings", label: "Settings", path: "/settings" },
];

interface ShellProps {
  sites: Site[];
  site: Site | undefined;
  view: SiteView | null;
  pathname: string;
  email: string;
  children: ReactNode;
}

export function Shell({ sites, site, view, pathname, email, children }: ShellProps) {
  const [menu, setMenu] = useState(false);
  // Close the mobile menu on navigation.
  useEffect(() => setMenu(false), [pathname]);
  const lastSite = useRef<Site | undefined>(undefined);
  if (site) lastSite.current = site;
  const liveSite = site ?? sites.find((s) => s.id === lastSite.current?.id) ?? sites[0];

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container nav-wrap">
          <Link className="wordmark" href="/" aria-label="Trustworthy, home">
            Trustworthy
          </Link>
          <button type="button" className="menu-button" aria-expanded={menu} aria-controls="site-nav" onClick={() => setMenu((m) => !m)}>
            {menu ? "Close" : "Menu"}
          </button>
          <nav id="site-nav" className="nav" aria-label="Primary" data-open={menu || undefined}>
            {liveSite && <LiveCount site={liveSite} />}
            {sites.length > 0 && <SiteSwitcher sites={sites} current={site} view={view} />}
            <Link href="/new" aria-current={pathname === "/new" ? "page" : undefined}>
              Add site
            </Link>
            <Link href="/privacy" aria-current={pathname === "/privacy" ? "page" : undefined}>
              Privacy
            </Link>
            <span className="nav__sep" aria-hidden />
            <AccountMenu email={email} active={pathname === "/account"} />
          </nav>
        </div>
      </header>
      <main id="main" className="container page">
        {site && view && <SiteHead site={site} view={view} />}
        {children}
      </main>
    </>
  );
}

function SiteHead({ site, view }: { site: Site; view: SiteView }) {
  const recent = site.lastHitAt && Date.now() - new Date(site.lastHitAt).getTime() < 5 * 60_000;
  const rt = useRealtime(site.id, 30_000);
  const live = rt.data?.pageviewsLast5 ?? 0;
  return (
    <>
      <div className="page-head">
        <p className="eyebrow">
          <a href={`https://${site.domain}`} target="_blank" rel="noreferrer noopener" className="live" style={{ gap: "0.3rem" }}>
            {site.domain}
            <Icon name="arrow-up-right" />
          </a>
          <span className="live">
            <span className="live__dot" data-idle={recent ? undefined : ""} aria-hidden />
            {site.lastHitAt ? `Last activity ${timeAgo(site.lastHitAt)}` : "No data yet"}
          </span>
        </p>
        <h1 className="display">{site.name}</h1>
      </div>
      <nav className="subnav" aria-label={`${site.name} sections`}>
        {siteNav.map((n) => (
          <Link key={n.view} href={`/sites/${site.id}${n.path}`} aria-current={view === n.view ? "page" : undefined}>
            {n.label}
            {n.view === "live" && live > 0 && (
              <span className="count">
                {compact(live)}
                <span className="sr-only"> pageviews in the last 5 minutes</span>
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}

function LiveCount({ site }: { site: Site }) {
  const rt = useRealtime(site.id, 15_000);
  const n = rt.data?.pageviewsLast5 ?? 0;
  return (
    <Link href={`/sites/${site.id}/live`} className="live" title={`${n.toLocaleString()} pageviews on ${site.domain} in the last 5 minutes`}>
      <span className="live__dot" data-idle={n === 0 ? "" : undefined} aria-hidden />
      <span>
        {compact(n)} <span className="muted">/ 5 min</span>
      </span>
    </Link>
  );
}

function SiteSwitcher({ sites, current, view }: { sites: Site[]; current: Site | undefined; view: SiteView | null }) {
  const [open, setOpen] = useState(false);
  const go = (s: Site) => {
    setOpen(false);
    navigate(`/sites/${s.id}${view && view !== "overview" ? `/${view}` : ""}`);
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      trigger={(p) => (
        <button type="button" className="nav-button" {...p}>
          Sites <span className="muted">{sites.length}</span>
          <Icon name="chevron-down" />
        </button>
      )}
    >
      <ul className="menu" aria-label="Websites">
        {sites.map((s) => (
          <li key={s.id}>
            <button type="button" className="menu__item" aria-current={current?.id === s.id ? "true" : undefined} onClick={() => go(s)}>
              <span className="menu__check">{current?.id === s.id && <Icon name="check" />}</span>
              <span>{s.name}</span>
              <span className="menu__meta">{s.name === s.domain ? "" : s.domain}</span>
            </button>
          </li>
        ))}
        <li className="menu__sep" aria-hidden />
        <li>
          <button
            type="button"
            className="menu__item"
            onClick={() => {
              setOpen(false);
              navigate("/new");
            }}
          >
            <span className="menu__check">
              <Icon name="plus" />
            </span>
            Add a website
          </button>
        </li>
      </ul>
    </Popover>
  );
}

function AccountMenu({ email, active }: { email: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const signOut = async () => {
    await api.post("/api/logout").catch(() => undefined);
    qc.clear();
    navigate("/", { replace: true });
    await qc.invalidateQueries();
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      trigger={(p) => (
        <button type="button" className="nav-button" aria-current={active ? "page" : undefined} {...p}>
          Account
          <Icon name="chevron-down" />
        </button>
      )}
    >
      <div className="menu">
        <p className="menu__head">
          <span className="label">Signed in as</span>
          <span className="small">{email}</span>
        </p>
        <div className="menu__sep" />
        <button
          type="button"
          className="menu__item"
          onClick={() => {
            setOpen(false);
            navigate("/account");
          }}
        >
          Account settings
        </button>
        <button type="button" className="menu__item" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </Popover>
  );
}
